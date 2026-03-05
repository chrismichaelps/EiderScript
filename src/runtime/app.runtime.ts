/** @EiderScript.Runtime.App - createEiderApp factory: compiles ASTs → Vue app instance */
import { createApp, createSSRApp } from 'vue'
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

/** @EiderScript.Runtime.App - Input descriptor for createEiderApp */
export interface EiderAppInput {
  /** Main app .eider.yaml content (kind: app) */
  app: string
  /** Map of component name → .eider.yaml content (kind: component) */
  components?: Record<string, string>
  /** Map of store id → .eider.yaml content (kind: store) */
  stores?: Record<string, string>
  /** Enable SSR mode (uses createSSRApp) */
  ssr?: boolean
}

/** @EiderScript.Runtime.App - Resolved live application handle */
export interface EiderApp {
  readonly vueApp: ReturnType<typeof createApp>
  readonly router: Router | null
  readonly mount: (selector: string) => void
}

/** @EiderScript.Runtime.App - Main public API: compiles YAML → live Vue app */
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
      fragmentHtmlTag: eiderConstants.fragmentHtmlTag,
      directiveRe: new RegExp(`^(${eiderConstants.dirIf}|${eiderConstants.dirFor}|${eiderConstants.dirModel}|@\\w[\\w.]*|:\\w[\\w-]*)$`),
    }

    const pinia = createPinia()
    const compiledComponents: Record<string, unknown> = {}

    // Parse + compile all component YAMLs
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
      const component = yield* compileComponent(doc.ast as ComponentAST).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      compiledComponents[name] = component
    }

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

    // Compile inline components (embedded in app YAML under `components:`)
    // These are already Zod-validated — no re-parsing needed.
    for (const compAst of appAst.components ?? []) {
      const component = yield* compileComponent(compAst).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      compiledComponents[compAst.name] = component
    }

    // Compile external component YAMLs (passed via input.components)
    // External definitions override inline ones on name collision.
    const RootComponent = appAst.template
      ? {
        name: appAst.name,
        render() {
          const scope = createScope({}, {}, {}, {}, undefined, eiderConstants.interpolationPrefix)
          return compileNode(appAst.template, scope, tplConfig)
        },
      }
      : { name: appAst.name, template: eiderConstants.routerViewTemplate }

    // Create Vue app
    const vueApp = input.ssr
      ? createSSRApp(RootComponent as Parameters<typeof createSSRApp>[0])
      : createApp(RootComponent as Parameters<typeof createApp>[0])

    vueApp.use(pinia)

    // Compile + register stores
    for (const [, yaml] of Object.entries(input.stores ?? {})) {
      const storeDoc = yield* parseYaml(yaml).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      if (storeDoc.kind !== eiderConstants.kindStore) continue
      yield* compileStore(storeDoc.ast as StoreAST).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
    }

    // Compile + install router
    const resolveComponent = (name: string): RouteComponent =>
      (compiledComponents[name] as RouteComponent | undefined) ??
      ({ template: `${eiderConstants.routerFallbackPrefix} ${name} ${eiderConstants.routerFallbackSuffix}` } satisfies RouteComponent)

    const router = compileRouter(appAst, resolveComponent, input.ssr ?? false)
    if (router) vueApp.use(router)

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
