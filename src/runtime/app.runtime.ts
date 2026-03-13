/** @EiderScript.Runtime.App - createEiderApp factory: compiles ASTs to Vue app instance */
import { createApp, createSSRApp, Fragment, type Plugin } from 'vue'
import { createPinia } from 'pinia'
import { Effect } from 'effect'
import { parseYaml } from '../parser/yaml.parser.js'
import { compileComponent } from '../compiler/component.compiler.js'
import { compileStore } from '../compiler/store.compiler.js'
import { compileRouter } from '../compiler/router.compiler.js'
import { type TemplateCompilerConfig, compileNode } from '../compiler/template.compiler.js'
import { createScope } from './scope.js'
import { RuntimeError } from '../effects/errors.js'
import { EiderConstValues } from '../config/constants.js'
import type { Router, RouteComponent } from 'vue-router'
import type { AppAST } from '../schema/router.schema.js'
import type { ComponentAST } from '../schema/component.schema.js'
import type { StoreAST } from '../schema/store.schema.js'

/** Derives the composable name for a store id. */
function storeComposableName(id: string): string {
  const pascal = id.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase())
  return 'use' + pascal.charAt(0).toUpperCase() + pascal.slice(1) + 'Store'
}

/** @EiderScript.Runtime.App - Input descriptor for createEiderApp */
export interface EiderAppInput {
  /** Main app .eider.yaml content (kind: app) */
  app: string
  /** Map of component name to .eider.yaml content (kind: component) */
  components?: Record<string, string>
  /** Map of store id to .eider.yaml content (kind: store) */
  stores?: Record<string, string>
  /** Custom Vue plugins to register (mapped by their name in app global plugins list) */
  plugins?: Record<string, Plugin>
  /** Enable SSR mode (uses createSSRApp) */
  ssr?: boolean
  /** Force router to use memory history (useful for embedded apps like playgrounds) */
  memoryRouter?: boolean
}

/** @EiderScript.Runtime.App - Resolved live application handle */
export interface EiderApp {
  readonly vueApp: ReturnType<typeof createApp>
  readonly router: Router | null
  readonly mount: (selector: string) => void
}

/** @EiderScript.Runtime.App - Main public API: compiles YAML to live Vue app */
export const createEiderApp = (
  input: EiderAppInput,
): Effect.Effect<EiderApp, RuntimeError> =>
  Effect.gen(function* () {
    const eiderConstants = yield* EiderConstValues

    const tplConfig: TemplateCompilerConfig = {
      dirIf: eiderConstants.dirIf,
      dirFor: eiderConstants.dirFor,
      dirModel: eiderConstants.dirModel,
      defaultHtmlTag: eiderConstants.defaultHtmlTag,
      fragmentHtmlTag: Fragment as string | symbol | object,
      directiveRe: new RegExp(`^(${eiderConstants.dirIf}|v-else-if|v-else|${eiderConstants.dirFor}|${eiderConstants.dirModel}|v-show|v-bind|v-on|v-slot|v-once|v-pre|v-memo|v-cloak|v-text|v-html|@\\w[\\w.-]*|:\\w[\\w.-]*|#\\w[\\w.-]*)$`),
    }

    const pinia = createPinia()
    const compiledComponents: Record<string, unknown> = {}
    // Stores for component scopes
    const globalStores: Record<string, unknown> = {}

    // Router proxy populated after compilation
    // Captured by reference in globalStores for routing support
    const routerRef: { current: import('vue-router').Router | null } = { current: null }
    const lazyRouter = {
      push: (to: unknown) => routerRef.current?.push(to as import('vue-router').RouteLocationRaw),
      replace: (to: unknown) => routerRef.current?.replace(to as import('vue-router').RouteLocationRaw),
      go: (delta: number) => routerRef.current?.go(delta),
      back: () => routerRef.current?.go(-1),
    }
    globalStores['$router'] = lazyRouter

    // Parse app YAML
    const appDoc = yield* parseYaml(input.app).pipe(
      Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
    )
    if (appDoc.kind !== 'app') {
      return yield* Effect.fail(
        new RuntimeError({
          message: `Root YAML must be "app" kind, got "${appDoc.kind}"`,
        }),
      )
    }
    const appAst = appDoc.ast as AppAST

    // Configure Vue app
    const RootComponent = appAst.template
      ? {
        name: appAst.name,
        render() {
          const scope = createScope({}, {}, {}, {}, undefined, eiderConstants.interpolationPrefix)
          return compileNode(appAst.template, scope, tplConfig)
        },
      }
      : { name: appAst.name, template: eiderConstants.routerViewTemplate }

    const vueApp = input.ssr
      ? createSSRApp(RootComponent as Parameters<typeof createSSRApp>[0])
      : createApp(RootComponent as Parameters<typeof createApp>[0])

    vueApp.use(pinia)

    // Compile stores before components
    for (const [storeId, yaml] of Object.entries(input.stores ?? {})) {
      const storeDoc = yield* parseYaml(yaml).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      if (storeDoc.kind !== eiderConstants.kindStore) continue
      const storeFactory = yield* compileStore(storeDoc.ast as StoreAST).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      // Register store composable
      const composableName = storeComposableName(storeId)
      globalStores[composableName] = storeFactory as (...args: unknown[]) => unknown
    }

    // Compile external component YAMLs passed via input components
    for (const [name, yaml] of Object.entries(input.components ?? {})) {
      const doc = yield* parseYaml(yaml).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      if (doc.kind !== 'component') {
        return yield* Effect.fail(
          new RuntimeError({
            message: `Expected component YAML for "${name}", got "${doc.kind}"`,
          }),
        )
      }
      const component = yield* compileComponent(doc.ast as ComponentAST, globalStores as Record<string, (...args: unknown[]) => unknown>).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      compiledComponents[name] = component
    }

    // Compile inline components embedded in app YAML under components key
    // These are already Zod-validated — no re-parsing needed.
    const componentsToCompile = appAst.components ?? []

    for (const compAst of componentsToCompile) {
      const component = yield* compileComponent(compAst, globalStores as Record<string, (...args: unknown[]) => unknown>).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      compiledComponents[compAst.name] = component
    }

    // Compile + install router
    const resolveComponent = (name: string): RouteComponent =>
      (compiledComponents[name] as RouteComponent | undefined) ??
      ({ template: `${eiderConstants.routerFallbackPrefix} ${name} ${eiderConstants.routerFallbackSuffix}` } satisfies RouteComponent)

    const router = compileRouter(appAst, resolveComponent, input.ssr ?? false, input.memoryRouter ?? false)
    // Bind router instance
    if (router) routerRef.current = router
    if (router) vueApp.use(router)

    // Load external global plugins
    if (appAst.global?.plugins) {
      for (const pluginName of appAst.global.plugins) {
        if (pluginName === 'pinia' || pluginName === 'vue-router') continue

        const externalPlugin = input.plugins?.[pluginName]
        if (externalPlugin) {
          vueApp.use(externalPlugin)
        } else {
          console.warn(`[EiderScript] Plugin "${pluginName}" was requested in YAML but not provided in EiderAppInput.plugins map.`)
        }
      }
    }

    // Register compiled components globally
    for (const [name, component] of Object.entries(compiledComponents)) {
      vueApp.component(
        name,
        component as Parameters<typeof vueApp.component>[1],
      )
    }

    return {
      vueApp,
      router,
      mount: (selector: string) => vueApp.mount(selector),
    }
  }).pipe(
    Effect.catchAll(e => e instanceof RuntimeError ? Effect.fail(e) : Effect.fail(new RuntimeError({ message: String(e) })))
  )
