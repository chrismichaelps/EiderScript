/** @EiderScript.Runtime.Scope - Reactive eval scope for expr-eval expressions */
import { computed, ref } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { Parser } from 'expr-eval'

export interface Scope {
  readonly signals: Record<string, Ref<unknown>>
  readonly computeds: Record<string, ComputedRef<unknown>>
  readonly methods: Record<string, (...args: unknown[]) => unknown>
  readonly props: Record<string, unknown>
  evaluate: (expr: string) => unknown
}

const exprParser = new Parser()

/** @EiderScript.Runtime.Scope - Builds reactive evaluation scope */
export function createScope(
  props: Record<string, unknown>,
  signalDefs: Record<string, unknown>,
  computedDefs: Record<string, string>,
  methodDefs: Record<string, string>,
  interpolationPrefix = '{{',
): Scope {
  const signals: Record<string, Ref<unknown>> = {}
  for (const [key, initial] of Object.entries(signalDefs)) {
    signals[key] = ref(
      typeof initial === 'string' && initial.startsWith(interpolationPrefix)
        ? undefined
        : initial,
    )
  }

  const scopeProxy: Record<string, unknown> = { ...props }
  for (const [key, r] of Object.entries(signals)) {
    Object.defineProperty(scopeProxy, key, {
      get: () => r.value,
      set: (v: unknown) => { r.value = v },
      enumerable: true,
    })
  }

  const computedRefs: Record<string, ComputedRef<unknown>> = {}
  for (const [key, expr] of Object.entries(computedDefs)) {
    computedRefs[key] = computed(() => {
      try {
        return exprParser.parse(expr).evaluate(scopeProxy as any)
      } catch {
        return undefined
      }
    })
    Object.defineProperty(scopeProxy, key, {
      get: () => computedRefs[key]?.value,
      enumerable: true,
    })
  }

  const methods: Record<string, (...args: unknown[]) => unknown> = {}
  for (const [key, expr] of Object.entries(methodDefs)) {
    methods[key] = () => {
      try {
        return exprParser.parse(expr).evaluate(scopeProxy as any)
      } catch {
        return undefined
      }
    }
    scopeProxy[key] = methods[key]
  }

  return {
    signals,
    computeds: computedRefs,
    methods,
    props,
    evaluate: (expr: string) => {
      try {
        return exprParser.parse(expr).evaluate(scopeProxy as any)
      } catch {
        return undefined
      }
    },
  }
}
