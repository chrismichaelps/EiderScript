/** @EiderScript.Compiler.Store - StoreAST to Pinia defineStore (Setup Store pattern) */
import { ref, computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import type { StoreAST } from '../schema/store.schema.js'
import { CompileError } from '../effects/errors.js'
import { EiderConstValues } from '../config/constants.js'
import { Effect } from 'effect'

function evalExpr(expr: string, scope: Record<string, unknown>): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function('ctx', `with(ctx) { return ${expr} }`)
    return fn(scope)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[EiderScript] evalExpr failed for: "${expr}"`, e)
    }
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
        // Log dev warnings
        if (ast.plugins && ast.plugins.length > 0) {
          for (const plugin of ast.plugins) {
            const pluginName = typeof plugin === 'string' ? plugin : plugin.name
            console.warn(
              `${eiderConstants.logPrefix} Store "${ast.id}" declares plugin "${pluginName}". ` +
              `Ensure it is registered via pinia.use() in your app setup or listed in app global.plugins.`,
            )
          }
        }

        if (ast.persist !== undefined && ast.persist !== false) {
          console.warn(
            `${eiderConstants.logPrefix} Store "${ast.id}" declares "persist". ` +
            `Ensure "pinia-plugin-persistedstate" (or equivalent) is installed and registered ` +
            `via pinia.use() before mounting the app. The persist config is passed through to the plugin.`,
          )
        }

        return defineStore(ast.id, () => {
          const state: Record<string, ReturnType<typeof ref>> = {}
          for (const [key, initial] of Object.entries(ast.state ?? {})) {
            state[key] = ref(initial)
          }

          // Create a target object that has all the keys to satisfy Proxy invariants
          const target: Record<string, unknown> = {}
          for (const key of Object.keys(state)) target[key] = undefined
          for (const key of Object.keys(ast.getters ?? {})) target[key] = undefined
          for (const key of Object.keys(ast.actions ?? {})) target[key] = undefined

          const scopeProxy = new Proxy(target, {
            get(_, key) {
              if (typeof key === 'string') {
                if (key in state) return state[key]!.value
                if (getters && key in getters) return getters[key]!.value
              }
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
            },
            ownKeys() {
              return Object.keys(target)
            },
            getOwnPropertyDescriptor(_, key) {
              if (typeof key === 'string' && key in target) {
                return { enumerable: true, configurable: true, writable: true }
              }
              return undefined
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

          /** Extract action params not in scope */
          function extractActionParams(originalBody: string): string[] {
            const stateKeys = new Set(Object.keys(ast.state ?? {}))
            const getterKeys = new Set(Object.keys(ast.getters ?? {}))
            const actionKeys = new Set(Object.keys(ast.actions ?? {}))
            const reserved = new Set([
              'if', 'else', 'return', 'const', 'let', 'var', 'true', 'false',
              'null', 'undefined', 'new', 'this', 'typeof', 'instanceof', 'in', 'of',
              'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
              'throw', 'try', 'catch', 'finally', 'delete', 'void', 'function',
              'class', 'extends', 'super', 'import', 'export', 'default',
              'async', 'await', 'yield',
              'Date', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number',
              'Boolean', 'Map', 'Set', 'Promise', 'Error', 'console', 'fetch',
              'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'NaN', 'Infinity',
            ])

            // Strip strings and backticks
            const body = originalBody
              .replace(/'[^']*'/g, "''")
              .replace(/"[^"]*"/g, '""')
              .replace(/\`[^\`]*\`/g, '``')

            const declared = new Set<string>()
            
            // Local declarations
            const declRe = /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\b/g
            let dMatch: RegExpExecArray | null
            while ((dMatch = declRe.exec(body)) !== null) {
              if (dMatch[1]) declared.add(dMatch[1])
            }

            // Single-param arrow functions
            const singleArrowRe = /\b([a-zA-Z_$][\w$]*)\s*=>/g
            while ((dMatch = singleArrowRe.exec(body)) !== null) {
              if (dMatch[1]) declared.add(dMatch[1])
            }

            // Multi-param arrow functions
            const multiArrowRe = /\(([^)]*)\)\s*=>/g
            while ((dMatch = multiArrowRe.exec(body)) !== null) {
              const paramsList = dMatch[1]
              if (paramsList) {
                const pMatch = paramsList.match(/\b([a-zA-Z_$][\w$]*)\b/g)
                if (pMatch) {
                  pMatch.forEach(p => declared.add(p))
                }
              }
            }

            // Catch blocks
            const catchRe = /\bcatch\s*\(\s*([a-zA-Z_$][\w$]*)\s*\)/g
            while ((dMatch = catchRe.exec(body)) !== null) {
              if (dMatch[1]) declared.add(dMatch[1])
            }

            const identRe = /\b([a-zA-Z_$][\w$]*)\b/g
            const seen = new Set<string>()
            const params: string[] = []
            
            let match: RegExpExecArray | null
            while ((match = identRe.exec(body)) !== null) {
              const name = match[1]!
              const idx = match.index!
              
              if (seen.has(name)) continue
              
              if (reserved.has(name) || declared.has(name) || stateKeys.has(name) || getterKeys.has(name) || actionKeys.has(name)) {
                seen.add(name)
                continue
              }

              // Property accesses
              if (idx > 0 && body[idx - 1] === '.' && !(idx >= 3 && body.slice(idx - 3, idx) === '...')) {
                seen.add(name)
                continue
              }

              // Object keys
              const after = body.slice(idx + name.length)
              if (/^\s*:/.test(after)) {
                seen.add(name)
                continue
              }

              seen.add(name)
              params.push(name)
            }
            return params
          }

          /** Wrap scope with call-site args */
          function wrapWithArgs(callArgs: unknown[], paramNames: string[]): Record<string, unknown> {
            if (callArgs.length === 0 || paramNames.length === 0) return scopeProxy
            const overlay: Record<string, unknown> = {}

            // Handle object-destructured style
            // If we have multiple params but only one object arg, try to pluck keys
            const firstArg = callArgs[0]
            if (
              callArgs.length === 1 &&
              typeof firstArg === 'object' &&
              firstArg !== null &&
              !Array.isArray(firstArg) &&
              paramNames.length > 1
            ) {
              const argObj = firstArg as Record<string, unknown>
              // If the object has at least one matching key, assume named args
              const hasMatchingKey = paramNames.some(p => p in argObj)
              if (hasMatchingKey) {
                for (const p of paramNames) {
                  if (p in argObj) overlay[p] = argObj[p]
                }
                // Also bind the whole object to the first param just in case
                if (!(paramNames[0]! in argObj)) overlay[paramNames[0]!] = firstArg
              } else {
                // Fallback to positional
                overlay[paramNames[0]!] = firstArg
              }
            } else {
              // Positional binding
              for (let i = 0; i < paramNames.length; i++) {
                overlay[paramNames[i]!] = callArgs[i]
              }
            }

            return new Proxy(scopeProxy, {
              get(t, k) {
                if (typeof k === 'string' && k in overlay) return overlay[k]
                return Reflect.get(t, k)
              },
              has(t, k) {
                if (typeof k === 'string' && k in overlay) return true
                return Reflect.has(t, k)
              },
              set(t, k, v) {
                if (typeof k === 'string' && k in t) {
                  t[k] = v
                  return true
                }
                return Reflect.set(t, k, v)
              },
            })
          }

          const actions: Record<string, (...args: unknown[]) => unknown> = {}
          for (const [name, def] of Object.entries(ast.actions ?? {})) {
            const isAsync = typeof def === 'object' && def.async === true
            const body = typeof def === 'string' ? def : def.body
            const paramNames = extractActionParams(body)

            if (isAsync) {
              actions[name] = (...callArgs: unknown[]) => {
                const scope = wrapWithArgs(callArgs, paramNames)
                // eslint-disable-next-line @typescript-eslint/no-implied-eval
                const fn = new Function(
                  'scope',
                  `with(scope) { return (async () => { ${body} })() }`,
                ) as (scope: Record<string, unknown>) => Promise<unknown>
                return fn(scope).catch((e: unknown) => {
                  if (process.env.NODE_ENV !== 'production') {
                    console.error(`[EiderScript] Store action "${name}" failed:`, e)
                  }
                })
              }
            } else {
              // Sync: JS fallback for multi-line support
              actions[name] = (...callArgs: unknown[]) => {
                try {
                  const scope = wrapWithArgs(callArgs, paramNames)
                  // eslint-disable-next-line @typescript-eslint/no-implied-eval
                  const fn = new Function('scope', `with(scope) { ${body} }`)
                  return fn(scope)
                } catch (e) {
                  if (process.env.NODE_ENV !== 'production') {
                    console.warn(`[EiderScript] Store action "${name}" failed:`, e)
                  }
                }
              }
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
