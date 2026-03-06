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

parser.functions.length = (obj: unknown): number => {
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length
  if (obj != null && typeof obj === 'object') return Object.keys(obj).length
  return 0
}

type ExprBindings = Parameters<ReturnType<typeof parser.parse>['evaluate']>[0]

/**
 * Detects standalone JS syntax that has no meaningful data-access
 * value in EiderScript and should silently return `undefined`.
 */
function isPureJsSyntax(expr: string): boolean {
  const t = expr.trim()
  if (/^(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>/.test(t)) return true
  if (/^class\s/.test(t)) return true
  if (/^function[\s(]/.test(t)) return true
  return false
}

const SMART_DOUBLE_RE = /[\u201C\u201D]/g
const SMART_SINGLE_RE = /[\u2018\u2019]/g

function sanitizeExpr(raw: string): string {
  return raw.replace(SMART_DOUBLE_RE, '"').replace(SMART_SINGLE_RE, "'")
}

const DOT_LENGTH_RE = /\b([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.length\b/g

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
      i++
    } else {
      current += ch
    }
  }

  segments.push(current.trim())
  return segments
}

function normalizeForExprEval(expr: string): string {
  let result = expr.replace(DOT_LENGTH_RE, 'length($1)')

  // Strict equality/inequality to loose (expr-eval only supports == and !=)
  result = result.replace(/!==/g, '!=')
  result = result.replace(/===/g, '==')

  // Logical AND
  result = result.replace(/&&/g, ' and ')

  // Prefix logical NOT: convert ! to not
  // (?<!\w) — not preceded by a word char (avoids factorial: n!)
  // (?!=)   — not followed by = (preserves !=)
  result = result.replace(/(?<!\w)!(?!=)/g, ' not ')

  const segments = splitLogicalOr(result)
  if (segments.length > 1) {
    result = segments.reduceRight(
      (fallback, segment) => `(${segment}) ? (${segment}) : (${fallback})`,
    )
  }

  return result
}

/**
 * Blocks expressions that access dangerous globals or dynamic code
 * execution primitives.  These must never reach `new Function()`.
 */
const DANGEROUS_JS_RE =
  /\b(?:import|require)\s*\(|\beval\s*\(|\bFunction\s*\(|\bprocess\b|\bchild_process\b|\bglobalThis\s*\.|\bDeno\b/

/**
 * Detects JS assignment operators that expr-eval cannot handle.
 *
 * Matches a bare `=` that is NOT part of:
 *   ==  !=  ===  !==  >=  <=  =>
 *
 * When an assignment is detected, expr-eval is skipped entirely
 * and the expression goes straight to the JS fallback where
 * `with(proxy) { x = expr }` can actually mutate the signal.
 */
const ASSIGNMENT_RE = /(?<![<>=!])=(?![=>])/

function normalizeResult(value: unknown): unknown {
  if (typeof value === 'number' && Number.isNaN(value)) return undefined
  return value
}

/**
 * Expected evaluation misses that should NOT produce console warnings.
 *
 * - **SyntaxError**: The expression simply isn't parseable JS.
 *   expr-eval already failed; there's nothing to log.
 *
 * - **TypeError (property of undefined/null)**: Normal for
 *   v-for iterator variables before the loop binds them (`todo.text`)
 *   and nested paths on missing scope bindings (`order.customer.name`).
 */
function isExpectedMiss(err: unknown): boolean {
  if (err instanceof SyntaxError) return true
  return (
    err instanceof TypeError &&
    /Cannot read properties of (undefined|null)/.test(err.message)
  )
}

function jsFallbackEvaluate(
  expr: string,
  bindings: Record<string, unknown>,
): unknown {
  try {
    let fn: Function
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      fn = new Function('$$ctx', `with($$ctx) { return (${expr}) }`)
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      fn = new Function('$$ctx', `with($$ctx) { ${expr} }`)
    }

    const result: unknown = fn(bindings)

    if (result instanceof Promise) {
      result.catch(() => {})
      return undefined
    }

    return result
  } catch (err) {
    if (!isExpectedMiss(err) && process.env.NODE_ENV !== 'production') {
      console.warn(`[EiderScript] JS fallback evaluation failed: ${expr}`, err)
    }
    return undefined
  }
}

function safeEvaluate(
  expr: string,
  bindings: Record<string, unknown>,
): unknown {
  const sanitized = sanitizeExpr(expr)
  if (!sanitized.trim()) return undefined
  if (isPureJsSyntax(sanitized)) return undefined

  // Assignments (x = expr, x += expr, …) MUST go through JS fallback.
  // expr-eval treats `=` as `==`, so `x = !x` silently evaluates as a
  // comparison returning a boolean — the signal is never mutated.
  if (!ASSIGNMENT_RE.test(sanitized)) {
    try {
      const result = parser
        .parse(normalizeForExprEval(sanitized))
        .evaluate(bindings as ExprBindings)
      return normalizeResult(result)
    } catch {
      // expr-eval failed — try JS fallback
    }
  }

  if (!DANGEROUS_JS_RE.test(sanitized)) {
    return normalizeResult(jsFallbackEvaluate(sanitized, bindings))
  }

  return undefined
}

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

interface StateTree {
  readonly props: Record<string, unknown>
  readonly signals: Record<string, Ref<unknown>>
  readonly computeds: Record<string, ComputedRef<unknown>>
  readonly methods: Record<string, (...args: unknown[]) => unknown>
  readonly context: ScopeContext
}

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

function buildProxy(tree: StateTree): Record<string, unknown> {
  return new Proxy(Object.create(null) as Record<string, unknown>, {
    get(_, key) {
      return typeof key === 'string' ? resolveKey(tree, key) : undefined
    },

    set(_, key, value) {
      if (typeof key !== 'string') return false

      if (key in tree.signals) {
        tree.signals[key]!.value = value
        return true
      }

      const isReadOnly =
        key in tree.props ||
        Boolean(tree.context.inject && key in tree.context.inject)

      if (isReadOnly && process.env.NODE_ENV !== 'production') {
        console.warn(`[EiderScript] Cannot mutate read-only binding "${key}"`)
      }

      return false
    },

    has(_, key) {
      if (typeof key !== 'string') return false
      if (key in globalThis) return false
      return true
    },
  })
}

/**
 * Extracts parameter names from a method body string.
 */
function extractMethodParams(body: string, tree: StateTree): string[] {
  const identRe = /\b([a-zA-Z_$][\w$]*)\b/g
  const seen = new Set<string>()
  const params: string[] = []

  const reserved = new Set([
    'if',
    'else',
    'return',
    'const',
    'let',
    'var',
    'true',
    'false',
    'null',
    'undefined',
    'new',
    'this',
    'typeof',
    'instanceof',
    'in',
    'of',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'break',
    'continue',
    'throw',
    'try',
    'catch',
    'finally',
    'delete',
    'void',
    'function',
    'class',
    'extends',
    'super',
    'import',
    'export',
    'default',
    'async',
    'await',
    'yield',
    'Date',
    'Math',
    'JSON',
    'Array',
    'Object',
    'String',
    'Number',
    'Boolean',
    'Map',
    'Set',
    'Promise',
    'Error',
    'console',
    'parseInt',
    'parseFloat',
    'isNaN',
    'isFinite',
    'NaN',
    'Infinity',
  ])

  let match: RegExpExecArray | null
  while ((match = identRe.exec(body)) !== null) {
    const name = match[1]!
    if (seen.has(name)) continue
    seen.add(name)

    if (reserved.has(name)) continue
    if (isKnownKey(tree, name)) continue

    const arrowParamRe = new RegExp(`(?:^|[,(])\\s*${name}\\s*(?=[,)=>])`)
    if (arrowParamRe.test(body)) continue

    params.push(name)
  }

  return params
}

/**
 * Creates a layered proxy that merges call-site arguments with scope bindings.
 */
function createLayeredProxy(
  proxy: Record<string, unknown>,
  paramNames: string[],
  args: unknown[],
): Record<string, unknown> {
  const overlay = Object.create(null) as Record<string, unknown>
  for (let i = 0; i < paramNames.length; i++) {
    overlay[paramNames[i]!] = args[i]
  }

  return new Proxy(proxy, {
    get(target, key) {
      if (typeof key === 'string' && key in overlay) {
        return overlay[key]
      }
      return Reflect.get(target, key)
    },
    set(target, key, value) {
      return Reflect.set(target, key, value)
    },
    has(target, key) {
      if (typeof key === 'string' && key in overlay) return true
      return Reflect.has(target, key)
    },
  })
}

/**
 * Builds a method function that supports call-site arguments.
 */
function buildMethod(
  body: string,
  tree: StateTree,
  proxy: Record<string, unknown>,
  forceAsync = false,
): (...args: unknown[]) => unknown {
  const paramNames = extractMethodParams(body, tree)
  const hasAwait = forceAsync || /\bawait\b/.test(body)

  const executeSync = (layered: Record<string, unknown>) =>
    safeEvaluate(body, layered)

  const executeAsync = (layered: Record<string, unknown>) => {
    const fn = new Function(
      ...paramNames,
      `return (async () => { try { return await (${body}) } catch(e) { console.error('Async method error:', e); throw e } })()`,
    )
    return fn(...paramNames.map((p) => layered[p]))
  }

  if (paramNames.length === 0) {
    if (hasAwait) {
      return () => {
        const fn = new Function(
          `return (async () => { try { return await (${body}) } catch(e) { console.error('Async method error:', e); throw e } })()`,
        )
        return fn()
      }
    }
    return () => safeEvaluate(body, proxy)
  }

  return (...args: unknown[]) => {
    const layered = createLayeredProxy(proxy, paramNames, args)
    return hasAwait ? executeAsync(layered) : executeSync(layered)
  }
}

export function createScope(
  props: Record<string, unknown>,
  signalDefs: Record<string, unknown> = {},
  computedDefs: Record<string, string | unknown> = {},
  methodDefs: Record<string, string | { body: string; async?: boolean }> = {},
  context: ScopeContext = {},
  interpolationPrefix = '{{',
): Scope {
  const signals = buildSignals(signalDefs, interpolationPrefix)

  const computeds: Record<string, ComputedRef<unknown>> = {}
  const methods: Record<string, (...args: unknown[]) => unknown> = {}

  const tree: StateTree = { props, signals, computeds, methods, context }
  const proxy = buildProxy(tree)

  for (const [key, expr] of Object.entries(computedDefs)) {
    computeds[key] =
      typeof expr === 'string'
        ? computed(() => safeEvaluate(expr, proxy))
        : computed(() => expr)
  }

  for (const [key, expr] of Object.entries(methodDefs)) {
    const isAsync = typeof expr === 'object' && expr.async === true
    const body = typeof expr === 'string' ? expr : expr.body
    methods[key] = buildMethod(body, tree, proxy, isAsync)
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

export function createRenderScope(
  ctx: Record<string, unknown>,
  interpolationPrefix = '{{',
): Scope {
  const guarded = new Proxy(ctx as object, {
    get(target, key) {
      if (typeof key === 'string' && key in target) {
        return (target as Record<string, unknown>)[key]
      }
      return undefined
    },
    has(_, key) {
      if (typeof key !== 'string') return false
      if (key in globalThis) return false
      return true
    },
  })

  return {
    signals: {},
    computeds: {},
    methods: {},
    props: {},

    evaluate: (expr: string) =>
      safeEvaluate(expr, guarded as Record<string, unknown>),

    createChild: (localProps: Record<string, unknown>) => {
      const child = new Proxy(Object.create(null) as Record<string, unknown>, {
        get(_, key) {
          if (typeof key !== 'string') return undefined
          if (key in localProps) return localProps[key]
          try {
            if (key in ctx) return (ctx as Record<string, unknown>)[key]
          } catch {
            // Guard: 'in' can throw on certain Vue internal proxies
          }
          return undefined
        },
        has(_, key) {
          if (typeof key !== 'string') return false
          if (key in globalThis) return false
          return true
        },
      })
      return createRenderScope(child, interpolationPrefix)
    },
  }
}
