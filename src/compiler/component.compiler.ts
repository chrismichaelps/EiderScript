/** @EiderScript.Compiler.Component — ComponentAST to Vue component definition object */
import {
  computed,
  onBeforeMount,
  onMounted,
  onUnmounted,
  onUpdated,
  watch,
  provide,
  inject,
} from 'vue'
import { Effect } from 'effect'
import type { ComponentAST } from '../schema/component.schema.js'
import { createScope, createRenderScope } from '../runtime/scope.js'
import type { Scope } from '../runtime/scope.js'
import { CompileError } from '../effects/errors.js'
import { LiveServices } from '../effects/layers.js'
import {
  compileNode,
  type TemplateCompilerConfig,
} from './template.compiler.js'
import { EiderConstValues } from '../config/constants.js'

interface ActionDef {
  readonly body: string
  readonly async?: boolean
}

interface WatchDef {
  readonly handler: string
  readonly immediate?: boolean
  readonly deep?: boolean
}

type EmitFn = (event: string, ...args: unknown[]) => void

function buildTemplateConfig(c: {
  readonly dirIf: string
  readonly dirFor: string
  readonly dirModel: string
  readonly defaultHtmlTag: string
  readonly fragmentHtmlTag: string
}): TemplateCompilerConfig {
  return {
    dirIf: c.dirIf,
    dirFor: c.dirFor,
    dirModel: c.dirModel,
    defaultHtmlTag: c.defaultHtmlTag,
    fragmentHtmlTag: c.fragmentHtmlTag,
    directiveRe: new RegExp(
      `^(${c.dirIf}|${c.dirFor}|${c.dirModel}|@\\w[\\w.]*|:\\w[\\w-]*)$`,
    ),
  }
}

function buildPropsSchema(
  propDefs: ComponentAST['props'],
): Record<string, { type: StringConstructor; default: unknown }> {
  const schema: Record<string, { type: StringConstructor; default: unknown }> =
    {}

  for (const [key, def] of Object.entries(propDefs ?? {})) {
    schema[key] = { type: String, default: def.default }
  }

  return schema
}

function resolveInjections(
  injectDef: ComponentAST['inject'],
): Record<string, unknown> {
  if (!injectDef) return {}

  const injected: Record<string, unknown> = {}

  if (Array.isArray(injectDef)) {
    for (const key of injectDef) {
      injected[key] = inject(key)
    }
  } else {
    for (const [localKey, injectKey] of Object.entries(injectDef)) {
      injected[localKey] = inject(injectKey)
    }
  }

  return injected
}

function registerProvisions(
  provideDef: ComponentAST['provide'],
  scope: Scope,
): void {
  if (!provideDef) return

  for (const [key, value] of Object.entries(provideDef)) {
    if (typeof value !== 'string') {
      provide(key, value)
      continue
    }

    const signal = scope.signals[value]
    if (signal) {
      provide(key, signal)
      continue
    }

    const comp = scope.computeds[value]
    if (comp) {
      provide(key, comp)
      continue
    }

    const method = scope.methods[value]
    if (method) {
      provide(key, method)
      continue
    }

    provide(key, computed(() => scope.evaluate(value)))
  }
}

const ASSIGNMENT_RE = /^([a-zA-Z_$][\w$]*)\s*=\s*(?!=)(.+)$/

function executeBody(body: string, scope: Scope): unknown {
  const statements = body
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  let result: unknown

  for (const stmt of statements) {
    const match = ASSIGNMENT_RE.exec(stmt)

    if (match) {
      const [, name, expr] = match
      if (name && expr) {
        const signal = scope.signals[name]
        if (signal) {
          const value = scope.evaluate(expr)
          signal.value = value
          result = value
          continue
        }
      }
    }

    result = scope.evaluate(stmt)
  }

  return result
}

/**
 * Snapshots all scope bindings into a flat record for use as
 * individual `Function` parameters.
 *
 * This replaces the original `with(scope)` pattern:
 * - Works in strict mode
 * - Compatible with CSP environments (no `eval`)
 * - Makes `emit`, signals, computeds, methods, and props available
 *   as bare identifiers inside the generated function body
 */
function collectScopeBindings(
  scope: Scope,
  emit: EmitFn | undefined,
): Record<string, unknown> {
  const bindings: Record<string, unknown> = {}

  for (const [key, signal] of Object.entries(scope.signals)) {
    bindings[key] = signal.value
  }
  for (const [key, comp] of Object.entries(scope.computeds)) {
    bindings[key] = comp.value
  }
  for (const [key, method] of Object.entries(scope.methods)) {
    bindings[key] = method
  }
  for (const [key, value] of Object.entries(scope.props)) {
    bindings[key] = value
  }
  if (emit) bindings['emit'] = emit

  return bindings
}

/**
 * Builds an async action executor.
 *
 * Async action bodies support full JavaScript syntax (`const`, `await`,
 * multi-arg function calls, control flow) — unlike sync actions which
 * route through expr-eval.
 *
 * Scope bindings are passed as individual Function parameters so that
 * `emit(...)`, signal reads, and method calls work as bare identifiers
 * without `with()`.
 */
function buildAsyncExecutor(
  body: string,
  scope: Scope,
  emit: EmitFn | undefined,
  errorPrefix: string,
  actionName: string,
): () => Promise<unknown> {
  return () => {
    const bindings = collectScopeBindings(scope, emit)
    const paramNames = Object.keys(bindings)
    const paramValues = Object.values(bindings)

    const effect = Effect.tryPromise({
      try: () => {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new Function(
          ...paramNames,
          `return (async () => { ${body} })()`,
        )
        return fn(...paramValues) as Promise<unknown>
      },
      catch: (cause) =>
        new CompileError({
          message: `${errorPrefix} [${actionName}]: ${cause instanceof Error ? cause.message : String(cause)}`,
        }),
    })

    return Effect.runPromise(Effect.provide(effect, LiveServices))
  }
}

function buildActions(
  actionDefs: Record<string, ActionDef> | undefined,
  scope: Scope,
  emit: EmitFn | undefined,
  errorPrefix: string,
): Record<string, () => unknown> {
  if (!actionDefs) return {}

  const actions: Record<string, () => unknown> = {}

  for (const [name, def] of Object.entries(actionDefs)) {
    actions[name] = def.async
      ? buildAsyncExecutor(def.body, scope, emit, errorPrefix, name)
      : () => executeBody(def.body, scope)
  }

  return actions
}

function registerWatchers(
  watchDefs: Record<string, WatchDef> | undefined,
  scope: Scope,
): void {
  if (!watchDefs) return

  for (const [signalName, def] of Object.entries(watchDefs)) {
    const source = scope.signals[signalName]
    if (!source) continue

    watch(
      source,
      (val) => {
        const child = scope.createChild({ val })
        child.evaluate(def.handler)
      },
      { immediate: def.immediate, deep: def.deep },
    )
  }
}

function registerLifecycleHooks(ast: ComponentAST, scope: Scope): void {
  const hooks: ReadonlyArray<
    [expr: string | undefined, register: (cb: () => void) => void]
  > = [
      [ast.onMounted, onMounted],
      [ast.onUnmounted, onUnmounted],
      [ast.onBeforeMount, onBeforeMount],
      [ast.onUpdated, onUpdated],
    ]

  for (const [expr, register] of hooks) {
    if (expr) register(() => scope.evaluate(expr))
  }
}

function buildSetupBindings(
  scope: Scope,
  actions: Record<string, () => unknown>,
): Record<string, unknown> {
  return {
    ...scope.signals,
    ...scope.computeds,
    ...scope.methods,
    ...actions,
  }
}

export const compileComponent = (
  ast: ComponentAST,
): Effect.Effect<Record<string, unknown>, CompileError> =>
  Effect.gen(function* () {
    const constants = yield* Effect.mapError(
      EiderConstValues,
      (configErr) =>
        new CompileError({
          message: `Configuration error: ${configErr.message}`,
          source: ast.name,
        }),
    )

    const tplConfig = buildTemplateConfig(constants)

    return yield* Effect.try({
      try: () => {
        const propsSchema = buildPropsSchema(ast.props)

        const setup = (
          props: Record<string, unknown>,
          ctx?: { emit: EmitFn },
        ): Record<string, unknown> => {
          const emit = ctx?.emit
          const injected = resolveInjections(ast.inject)

          const scope = createScope(
            props,
            ast.signals ?? {},
            ast.computeds ?? {},
            ast.methods ?? {},
            { emit, inject: injected },
            constants.interpolationPrefix,
          )

          registerProvisions(ast.provide, scope)

          const actions = buildActions(
            ast.actions as Record<string, ActionDef> | undefined,
            scope,
            emit,
            constants.errActionFailed,
          )

          registerWatchers(
            ast.watch as Record<string, WatchDef> | undefined,
            scope,
          )

          registerLifecycleHooks(ast, scope)

          return buildSetupBindings(scope, actions)
        }

        const render = function (
          this: Record<string, unknown>,
          ctx: Record<string, unknown>,
        ): ReturnType<typeof compileNode> {
          if (ast.template == null) return null

          // Vue binds `this` to the component proxy, but provides `ctx` as first arg.
          const renderCtx = this ?? ctx ?? {}
          return compileNode(
            ast.template,
            createRenderScope(renderCtx, constants.interpolationPrefix),
            tplConfig,
          )
        }

        return {
          name: ast.name,
          props: propsSchema,
          emits: ast.emits,
          setup,
          render,
        }
      },
      catch: (cause) =>
        new CompileError({
          message: `${constants.errCompileFailed} ${cause instanceof Error ? cause.message : String(cause)}`,
          source: ast.name,
        }),
    })
  })