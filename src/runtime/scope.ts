/** @EiderScript.Runtime.Scope — Reactive evaluation scope for expr-eval expressions */
import { computed, ref, unref } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { Parser } from 'expr-eval'

export interface Scope {
  readonly signals: Record<string, Ref<unknown>>
  readonly computeds: Record<string, ComputedRef<unknown>>
  readonly methods: Record<string, (...args: unknown[]) => unknown>
  readonly props: Record<string, unknown>
  evaluate(expr: string): unknown
  createChild(localProps: Record<string, unknown>): Scope
}

export interface ScopeContext {
  readonly emit?: (event: string, ...args: unknown[]) => void
  readonly inject?: Readonly<Record<string, unknown>>
}

const parser = new Parser()

/** Boundary type extracted from expr-eval — avoids manual `any`. */
type ExprBindings = Parameters<ReturnType<typeof parser.parse>['evaluate']>[0]

/**
 * Splits on exactly `||` (double pipe), preserving single `|`
 * (filter pipe) and ignoring triple `|||`.
 */
function splitLogicalOr(expr: string): string[] {
  const segments: string[] = []
  let current = ''

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]!
    const prev = i > 0 ? expr[i - 1] : ''
    const next = i < expr.length - 1 ? expr[i + 1] : ''
    const afterNext = i < expr.length - 2 ? expr[i + 2] : ''

    if (ch === '|' && next === '|' && prev !== '|' && afterNext !== '|') {
      segments.push(current.trim())
      current = ''
      i++ // skip second pipe
    } else {
      current += ch
    }
  }

  segments.push(current.trim())
  return segments
}

/**
 * Normalises JS logical operators to expr-eval equivalents:
 *   `&&`  →  `and`
 *   `||`  →  value-preserving ternary: `(a) ? (a) : (b)`
 *
 * Native expr-eval keywords (`and`, `or`, `not`) pass through unchanged.
 */
function normalizeExpr(raw: string): string {
  let expr = raw.replace(/&&/g, ' and ')

  const segments = splitLogicalOr(expr)
  if (segments.length > 1) {
    expr = segments.reduceRight(
      (fallback, segment) => `(${segment}) ? (${segment}) : (${fallback})`,
    )
  }

  return expr
}

/**
 * Evaluates an expression string against scope bindings.
 * Returns `undefined` for unparseable or failing expressions.
 */
function safeEvaluate(
  expr: string,
  bindings: Record<string, unknown>,
): unknown {
  try {
    return parser.parse(normalizeExpr(expr)).evaluate(bindings as ExprBindings)
  } catch {
    return undefined
  }
}

/**
 * Builds Vue refs from signal definitions.
 * Interpolation placeholder strings (e.g. `{{ expr }}`) initialise
 * to `undefined` — they are resolved at render time.
 */
function buildSignals(
  defs: Readonly<Record<string, unknown>>,
  interpolationPrefix: string,
): Record<string, Ref<unknown>> {
  const signals: Record<string, Ref<unknown>> = {}

  for (const [key, initial] of Object.entries(defs)) {
    const isPlaceholder =
      typeof initial === 'string' && initial.startsWith(interpolationPrefix)

    signals[key] = ref(isPlaceholder ? undefined : initial)
  }

  return signals
}

/**
 * Internal state backing the scope proxy.
 *
 * `computeds` and `methods` are populated **after** proxy creation
 * (they reference the proxy for evaluation). The proxy reads from
 * these same object references, so late additions are immediately
 * visible through the `get` trap.
 */
interface StateTree {
  readonly props: Record<string, unknown>
  readonly signals: Record<string, Ref<unknown>>
  readonly computeds: Record<string, ComputedRef<unknown>>
  readonly methods: Record<string, (...args: unknown[]) => unknown>
  readonly context: ScopeContext
}

/**
 * Resolution priority:
 *   emit → signals → computeds → methods → props → injections
 */
function resolveKey(tree: StateTree, key: string): unknown {
  if (key === 'emit') return tree.context.emit
  if (key in tree.signals) return tree.signals[key]!.value
  if (key in tree.computeds) return tree.computeds[key]!.value
  if (key in tree.methods) return tree.methods[key]
  if (key in tree.props) return unref(tree.props[key])

  const { inject } = tree.context
  return inject && key in inject ? unref(inject[key]) : undefined
}

function isKnownKey(tree: StateTree, key: string): boolean {
  return (
    key === 'emit' ||
    key in tree.signals ||
    key in tree.computeds ||
    key in tree.methods ||
    key in tree.props ||
    Boolean(tree.context.inject && key in tree.context.inject)
  )
}

/**
 * Flat `Record<string, unknown>` proxy over the entire state tree.
 *
 * - **get**: resolves through the priority chain
 * - **set**: only signal refs are mutable; props/injections are blocked
 * - **has**: supports `with()`-style membership checks from expr-eval
 */
function buildProxy(tree: StateTree): Record<string, unknown> {
  return new Proxy(Object.create(null) as Record<string, unknown>, {
    get(_, key) {
      return typeof key === 'string' ? resolveKey(tree, key) : undefined
    },

    set(_, key, value) {
      if (typeof key !== 'string') return false

      // Signals are the only mutable bindings
      if (key in tree.signals) {
        tree.signals[key]!.value = value
        return true
      }

      // Props and injections are read-only
      const isReadOnly =
        key in tree.props ||
        Boolean(tree.context.inject && key in tree.context.inject)

      if (isReadOnly && process.env.NODE_ENV !== 'production') {
        console.warn(`[EiderScript] Cannot mutate read-only binding "${key}"`)
      }

      return false
    },

    has(_, key) {
      return typeof key === 'string' && isKnownKey(tree, key)
    },
  })
}

/** Builds a reactive evaluation scope from component definitions. */
export function createScope(
  props: Record<string, unknown>,
  signalDefs: Record<string, unknown> = {},
  computedDefs: Record<string, string | unknown> = {},
  methodDefs: Record<string, string> = {},
  context: ScopeContext = {},
  interpolationPrefix = '{{',
): Scope {
  const signals = buildSignals(signalDefs, interpolationPrefix)

  // Mutable containers — populated below, but the proxy reads from
  // these same references so late additions are visible immediately.
  const computeds: Record<string, ComputedRef<unknown>> = {}
  const methods: Record<string, (...args: unknown[]) => unknown> = {}

  const tree: StateTree = { props, signals, computeds, methods, context }
  const proxy = buildProxy(tree)

  // Wire computed refs (may reference signals, methods, props via proxy)
  for (const [key, expr] of Object.entries(computedDefs)) {
    computeds[key] =
      typeof expr === 'string'
        ? computed(() => safeEvaluate(expr, proxy))
        : computed(() => expr)
  }

  // Wire methods (expression strings evaluated against live scope state)
  for (const [key, expr] of Object.entries(methodDefs)) {
    methods[key] = () => safeEvaluate(expr, proxy)
  }

  return {
    signals,
    computeds,
    methods,
    props,

    evaluate: (expr: string) => safeEvaluate(expr, proxy),

    createChild: (localProps: Record<string, unknown>) =>
      createScope(
        { ...props, ...localProps },
        {},
        {},
        {},
        { ...context, inject: { ...(context.inject ?? {}), ...localProps } },
        interpolationPrefix,
      ),
  }
}