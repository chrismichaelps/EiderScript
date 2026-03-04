/** @EiderScript.Runtime.Scope - Reactive eval scope for expr-eval expressions */
import { computed, ref } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export interface Scope {
  readonly signals: Record<string, Ref<unknown>>
  readonly computeds: Record<string, ComputedRef<unknown>>
  readonly methods: Record<string, (...args: unknown[]) => unknown>
  readonly props: Record<string, unknown>
  evaluate: (expr: string) => unknown
}

/** @EiderScript.Runtime.Scope - Safe JS expression evaluator using sandboxed Function.
 *  Supports the full JS expression syntax: ||, &&, ternary, template literals,
 *  method calls, etc.  The scope proxy is injected as named parameters so the
 *  function body has no access to the outer global scope.
 *
 *  Also normalizes expr-eval DSL keywords to JS operators for backward compat:
 *    and → &&   or → ||   not → !   eq → ===   ne → !==   lt → <   gt → >   le → <=   ge → >=
 */
function normalizeExpr(expr: string): string {
  return expr
    // word-boundary replacements to avoid partial matches inside identifiers
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    .replace(/\bnot\b/g, '!')
    .replace(/\beq\b/g, '===')
    .replace(/\bne\b/g, '!==')
    .replace(/\blt\b/g, '<')
    .replace(/\bgt\b/g, '>')
    .replace(/\ble\b/g, '<=')
    .replace(/\bge\b/g, '>=')
}

function jsEval(expr: string, scopeProxy: Record<string, unknown>): unknown {
  try {
    const keys = Object.keys(scopeProxy)
    const vals = Object.values(scopeProxy)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...keys, `"use strict"; return (${normalizeExpr(expr)})`)
    return fn(...vals)
  } catch {
    return undefined
  }
}

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
    computedRefs[key] = computed(() => jsEval(expr, scopeProxy))
    Object.defineProperty(scopeProxy, key, {
      get: () => computedRefs[key]?.value,
      enumerable: true,
    })
  }

  const methods: Record<string, (...args: unknown[]) => unknown> = {}
  for (const [key, expr] of Object.entries(methodDefs)) {
    methods[key] = () => jsEval(expr, scopeProxy)
    scopeProxy[key] = methods[key]
  }

  return {
    signals,
    computeds: computedRefs,
    methods,
    props,
    evaluate: (expr: string) => jsEval(expr, scopeProxy),
  }
}
