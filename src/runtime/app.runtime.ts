/** @EiderScript.Runtime.App - createEiderApp factory: compiles ASTs → Vue app instance */
import { createApp, createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { Effect } from 'effect'
import { parseYaml } from '../parser/yaml.parser.js'
import { compileComponent } from '../compiler/component.compiler.js'
import { compileStore } from '../compiler/store.compiler.js'
import { compileRouter } from '../compiler/router.compiler.js'
import { compileNode } from '../compiler/template.compiler.js'
import { createScope } from './scope.js'
import { RuntimeError } from '../effects/errors.js'
import type { RouteComponent } from 'vue-router'
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
  readonly mount: (selector: string) => void
}

/** @EiderScript.Runtime.App - Main public API: compiles YAML → live Vue app */
export const createEiderApp = (
  input: EiderAppInput,
): Effect.Effect<EiderApp, RuntimeError> =>
  Effect.gen(function* () {
    const pinia = createPinia()
    const compiledComponents: Record<string, unknown> = {}

    // ── 1. Parse + compile all component YAMLs ──────────────────────────────
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

    // ── 2. Parse app YAML ────────────────────────────────────────────────────
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

    // ── 3. Build root component ──────────────────────────────────────────────
    const RootComponent = appAst.template
      ? {
        name: appAst.name,
        render() {
          const scope = createScope({}, {}, {}, {})
          return compileNode(appAst.template, scope)
        },
      }
      : { name: appAst.name, template: '<router-view />' }

    // ── 4. Create Vue app ────────────────────────────────────────────────────
    const vueApp = input.ssr
      ? createSSRApp(RootComponent as Parameters<typeof createSSRApp>[0])
      : createApp(RootComponent as Parameters<typeof createApp>[0])

    vueApp.use(pinia)

    // ── 5. Compile + register stores ─────────────────────────────────────────
    for (const [, yaml] of Object.entries(input.stores ?? {})) {
      const storeDoc = yield* parseYaml(yaml).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
      if (storeDoc.kind !== 'store') continue
      yield* compileStore(storeDoc.ast as StoreAST).pipe(
        Effect.mapError((e) => new RuntimeError({ message: e.message, cause: e })),
      )
    }

    // ── 6. Compile + install router ──────────────────────────────────────────
    const resolveComponent = (name: string): RouteComponent =>
      (compiledComponents[name] as RouteComponent | undefined) ??
      ({ template: `<div>[ ${name} ]</div>` } satisfies RouteComponent)

    const router = compileRouter(appAst, resolveComponent, input.ssr ?? false)
    if (router) vueApp.use(router)

    // ── 7. Register compiled components globally ─────────────────────────────
    for (const [name, component] of Object.entries(compiledComponents)) {
      vueApp.component(
        name,
        component as Parameters<typeof vueApp.component>[1],
      )
    }

    return {
      vueApp,
      mount: (selector: string) => vueApp.mount(selector),
    }
  })
