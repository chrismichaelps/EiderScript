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

type ExprBindings = Parameters<ReturnType<typeof exprParser.parse>['evaluate']>[0]

function evalExpr(expr: string, scope: Record<string, unknown>): unknown {
  try {
    return exprParser.parse(expr).evaluate(scope as ExprBindings)
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

          const scopeProxy = new Proxy({} as Record<string, unknown>, {
            get(_, key) {
              if (typeof key === 'string' && key in state) return state[key]!.value
              if (typeof key === 'string' && getters && key in getters) return getters[key]!.value
              return undefined
            },
            set(_, key, value) {
              if (typeof key === 'string' && key in state) {
                state[key]!.value = value
                return true
              }
              return false
            },
            has(_, key) {
              if (typeof key !== 'string') return false
              return key in state || (getters && key in getters)
            }
          })

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
                      'scope',
                      `with(scope) { return (async () => { ${body} })() }`,
                    )
                    return fn(scopeProxy)
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
