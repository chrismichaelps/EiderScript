/** @EiderScript.Compiler.Component - ComponentAST → Vue component definition object */
import {
  computed,
  onBeforeMount,
  onMounted,
  onUnmounted,
  onUpdated,
  watch,
} from 'vue'
import { Effect } from 'effect'
import { Parser } from 'expr-eval'
import type { ComponentAST } from '../schema/component.schema.js'
import { createScope } from '../runtime/scope.js'
import { CompileError } from '../effects/errors.js'
import { LiveServices } from '../effects/layers.js'
import { compileNode, type TemplateCompilerConfig } from './template.compiler.js'
import { EiderConstValues } from '../config/constants.js'

const exprParser = new Parser()

function evalExpr(expr: string, scope: Record<string, unknown>): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return exprParser.parse(expr).evaluate(scope as any)
  } catch {
    return undefined
  }
}

/** @EiderScript.Compiler.Component - Builds async action wrapped in Effect + LiveServices */
function buildAsyncAction(body: string, scopeProxy: Record<string, unknown>, errMsg: string) {
  return () => {
    const effect = Effect.tryPromise({
      try: async () => {
        const fn = new Function(
          ...Object.keys(scopeProxy),
          `return (async () => { ${body} })()`,
        )
        return fn(...Object.values(scopeProxy))
      },
      catch: (e) =>
        new CompileError({ message: `${errMsg} ${String(e)}` }),
    })
    return Effect.runPromise(Effect.provide(effect, LiveServices))
  }
}

/** @EiderScript.Compiler.Component - Compiles ComponentAST into a Vue component options object */
export const compileComponent = (
  ast: ComponentAST,
): Effect.Effect<Record<string, unknown>, CompileError> =>
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

    return yield* Effect.try({
      try: () => {
        const propsShape: Record<string, unknown> = {}
        for (const [key, def] of Object.entries(ast.props ?? {})) {
          propsShape[key] = { type: String, default: def.default }
        }

        const setup = (props: Record<string, unknown>) => {
          const methodExprs = ast.methods ?? {}
          const scope = createScope(
            props,
            ast.signals ?? {},
            ast.computeds ?? {},
            methodExprs,
            eiderConstants.interpolationPrefix
          )

          const actions: Record<string, () => unknown> = {}
          for (const [name, def] of Object.entries(ast.actions ?? {})) {
            if (def.async) {
              actions[name] = buildAsyncAction(def.body, {
                ...props,
                ...Object.fromEntries(
                  Object.entries(scope.signals).map(([k, r]) => [k, r.value]),
                ),
              }, eiderConstants.errActionFailed)
            } else {
              actions[name] = () => evalExpr(def.body, { ...props })
            }
          }

          for (const [signal, def] of Object.entries(ast.watch ?? {})) {
            const source = scope.signals[signal]
            if (source) {
              watch(source, (val) => evalExpr(def.handler, { ...props, val }), {
                immediate: def.immediate,
                deep: def.deep,
              })
            }
          }

          if (ast.onMounted) {
            onMounted(() => scope.evaluate(ast.onMounted!))
          }
          if (ast.onUnmounted) {
            onUnmounted(() => scope.evaluate(ast.onUnmounted!))
          }
          if (ast.onBeforeMount) {
            onBeforeMount(() => scope.evaluate(ast.onBeforeMount!))
          }
          if (ast.onUpdated) {
            onUpdated(() => scope.evaluate(ast.onUpdated!))
          }

          return {
            ...Object.fromEntries(
              Object.entries(scope.signals).map(([k, r]) => [k, r]),
            ),
            ...Object.fromEntries(
              Object.entries(scope.computeds).map(([k, c]) => [
                k,
                computed(() => c.value),
              ]),
            ),
            ...scope.methods,
            ...actions,
          }
        }

        const render = function (this: Record<string, unknown>) {
          const renderScope = createScope(
            {},
            ast.signals ?? {},
            ast.computeds ?? {},
            ast.methods ?? {},
            eiderConstants.interpolationPrefix
          )
          return ast.template != null ? compileNode(ast.template, renderScope, tplConfig) : null
        }

        return {
          name: ast.name,
          props: propsShape,
          setup,
          render,
        }
      },
      catch: (e) =>
        new CompileError({
          message: `${eiderConstants.errCompileFailed} ${String(e)}`,
          source: ast.name,
        }),
    })
  }).pipe(
    Effect.catchAll(e => e instanceof CompileError ? Effect.fail(e) : Effect.fail(new CompileError({ message: String(e), source: ast.name })))
  )
