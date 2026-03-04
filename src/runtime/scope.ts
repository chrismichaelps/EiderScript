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
  createChild: (localProps: Record<string, unknown>) => Scope
}

const exprParser = new Parser()

/** @EiderScript.Runtime.Scope — Normalizes a mixed JS / expr-eval expression.
 *
 *  Accepts BOTH JS operator syntax and expr-eval DSL keywords:
 *    `a || b`  →  `a ? a : b`   (value-preserving short-circuit, not just boolean)
 *    `a && b`  →  `a and b`     (expr-eval `and` — returns boolean, fine for conditionals)
 *    expr-eval keywords `and`, `or`, `not` pass through unchanged.
 *
 *  Using expr-eval (not new Function) keeps evaluation safe inside Vitest's Node
 *  vm context (avoids ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING).
 */
function normalizeExpr(raw: string): string {
  let expr = raw

  // JS `&&` → expr-eval `and`
  expr = expr.replace(/&&/g, ' and ')

  // JS `||` → value-preserving ternary in expr-eval.
  // We split on `||` (not `|||`) using a character-level scan (same approach as
  // splitPipeExpr) to avoid regex capture-group consumption issues.
  const orParts: string[] = []
  let cur = ''
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]!
    if (ch === '|' && expr[i + 1] === '|' && expr[i - 1] !== '|' && expr[i + 2] !== '|') {
      orParts.push(cur.trim())
      cur = ''
      i++ // skip second `|`
    } else {
      cur += ch
    }
  }
  orParts.push(cur.trim())

  if (orParts.length > 1) {
    // Fold right-to-left: a || b || c → (a) ? (a) : ((b) ? (b) : (c))
    expr = orParts.reduceRight((acc, part) => `(${part}) ? (${part}) : (${acc})`)
  }

  return expr
}

function jsEval(expr: string, scopeProxy: Record<string, unknown>): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return exprParser.parse(normalizeExpr(expr)).evaluate(scopeProxy as any)
  } catch {
    return undefined
  }
}

/** @EiderScript.Runtime.Scope - Builds reactive evaluation scope */
export function createScope(
  props: Record<string, unknown>,
  signalDefs: Record<string, unknown> = {},
  computedDefs: Record<string, string | unknown> = {},
  methodDefs: Record<string, string> = {},
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
    if (typeof expr === 'string') {
      computedRefs[key] = computed(() => jsEval(expr, scopeProxy))
    } else {
      computedRefs[key] = computed(() => expr)
    }
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
    createChild: (localProps: Record<string, unknown>) => {
      const mergedProps = { ...props, ...localProps }
      const childScopeProxy = { ...scopeProxy, ...localProps }
      return {
        signals,
        computeds: computedRefs,
        methods,
        props: mergedProps,
        evaluate: (expr: string) => jsEval(expr, childScopeProxy),
        createChild: (nestedProps) => createScope({ ...mergedProps, ...nestedProps })
      }
    }
  }
}
