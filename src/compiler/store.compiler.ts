/** @EiderScript.Compiler.Store - StoreAST → Pinia defineStore (Setup Store pattern) */
import { ref, computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import { Effect } from 'effect'
import { Parser } from 'expr-eval'
import type { StoreAST } from '../schema/store.schema.js'
import { CompileError } from '../effects/errors.js'
import { LiveServices } from '../effects/layers.js'
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

/** @EiderScript.Compiler.Store - Compiles StoreAST into a callable Pinia store factory */
export const compileStore = (
  ast: StoreAST,
): Effect.Effect<ReturnType<typeof defineStore>, CompileError> =>
  Effect.gen(function* () {
    const eiderConstants = yield* EiderConstValues

    return yield* Effect.try({
      try: () => {
        return defineStore(ast.id, () => {
          const state: Record<string, ReturnType<typeof ref>> = {}
          for (const [key, initial] of Object.entries(ast.state ?? {})) {
            state[key] = ref(initial)
          }

          const scopeProxy: Record<string, unknown> = {}
          for (const [key, r] of Object.entries(state)) {
            Object.defineProperty(scopeProxy, key, {
              get: () => r.value,
              set: (v: unknown) => { r.value = v },
              enumerable: true,
            })
          }

          const getters: Record<string, ComputedRef<unknown>> = {}
          for (const [key, expr] of Object.entries(ast.getters ?? {})) {
            getters[key] = computed(() => evalExpr(expr, scopeProxy))
            Object.defineProperty(scopeProxy, key, {
              get: () => getters[key]?.value,
              enumerable: true,
            })
          }

          const actions: Record<string, (...args: unknown[]) => unknown> = {}
          for (const [name, def] of Object.entries(ast.actions ?? {})) {
            const isAsync = typeof def === 'object' && def.async === true
            const body = typeof def === 'string' ? def : def.body

            if (isAsync) {
              actions[name] = () => {
                const effect = Effect.tryPromise({
                  try: async () => {
                    const fn = new Function(
                      ...Object.keys(scopeProxy),
                      `return (async () => { ${body} })()`,
                    )
                    return fn(...Object.values(scopeProxy))
                  },
                  catch: (e) =>
                    new CompileError({ message: `${eiderConstants.errStoreActionFailed} ${String(e)}` }),
                })
                return Effect.runPromise(Effect.provide(effect, LiveServices))
              }
            } else {
              actions[name] = () => evalExpr(body, scopeProxy)
            }
          }

          for (const [key, def] of Object.entries(ast.watch ?? {})) {
            const source = state[key]
            if (source) {
              watch(
                source,
                (val: unknown) => evalExpr(def.handler, { ...scopeProxy, val }),
                {
                  immediate: def.immediate ?? false,
                  deep: def.deep ?? false,
                },
              )
            }
          }

          return { ...state, ...getters, ...actions }
        })
      },
      catch: (e) =>
        new CompileError({
          message: `${eiderConstants.errStoreCompileFailed} ${String(e)}`,
          source: ast.id,
        }),
    })
  }).pipe(
    Effect.catchAll(e => e instanceof CompileError ? Effect.fail(e) : Effect.fail(new CompileError({ message: String(e), source: ast.id })))
  )
