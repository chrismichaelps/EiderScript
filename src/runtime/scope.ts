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
  if (/^\(?[^)]*\)?\s*=>/.test(t)) return true   // arrow literal
  if (/^class\s/.test(t)) return true            // class declaration
  if (/^function[\s(]/.test(t)) return true      // function decl/expr
  return false
}

const SMART_DOUBLE_RE = /[\u201C\u201D]/g
const SMART_SINGLE_RE = /[\u2018\u2019]/g

function sanitizeExpr(raw: string): string {
  return raw.replace(SMART_DOUBLE_RE, '"').replace(SMART_SINGLE_RE, "'")
}

/**
 * Rewrites `identifier.length` and `path.to.prop.length` →
 * `length(identifier)` / `length(path.to.prop)`.
 *
 * expr-eval treats `length` as a reserved token and rejects
 * `.length` property access. The registered `length()` function
 * handles arrays, strings, and objects.
 *
 * Does NOT match `.length` after non-word characters (e.g.
 * `).length` in method chains) — those go to the JS fallback.
 */
const DOT_LENGTH_RE =
  /\b([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.length\b/g

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

/**
 * Transforms JS-like syntax into expr-eval equivalents:
 *   `obj.length`  →  `length(obj)`
 *   `&&`          →  `and`
 *   `||`          →  value-preserving ternary
 */
function normalizeForExprEval(expr: string): string {
  let result = expr.replace(DOT_LENGTH_RE, 'length($1)')
  result = result.replace(/&&/g, ' and ')

  const segments = splitLogicalOr(result)
  if (segments.length > 1) {
    result = segments.reduceRight(
      (fallback, segment) => `(${segment}) ? (${segment}) : (${fallback})`,
    )
  }

  return result
}

const JS_RESERVED = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
  'continue', 'return', 'throw', 'try', 'catch', 'finally',
  'new', 'delete', 'typeof', 'instanceof', 'in', 'of',
  'var', 'let', 'const', 'function', 'class', 'extends',
  'import', 'export', 'default', 'from', 'as',
  'async', 'await', 'yield', 'this', 'super', 'void', 'with',
  'and', 'or', 'not',
])

function extractIdentifiers(expr: string): string[] {
  const ids = new Set<string>()
  const re = /\b([a-zA-Z_$][\w$]*)\b/g
  let match: RegExpExecArray | null
  while ((match = re.exec(expr)) !== null) {
    const id = match[1]!
    if (!JS_RESERVED.has(id)) ids.add(id)
  }
  return [...ids]
}

/**
 * Arrow-callback method chains: `.filter(t => ...)`, `.map(x => ...)`
 *
 * This is the ONE pattern class that:
 *   1. expr-eval fundamentally cannot parse (arrow syntax)
 *   2. Is commonly used in EiderScript templates
 *   3. Is safe to evaluate via Function constructor
 */
const ARROW_CHAIN_RE = /\.\w+\s*\([^)]*=>/

/** Patterns that cause unhandled async rejections in `new Function`. */
const DANGEROUS_JS_RE = /\bimport\s*\(/

/**
 * Evaluates expressions containing JS-only syntax (arrow callbacks,
 * method chains) using a parameterised Function constructor.
 *
 * Scope bindings are passed as explicit parameters — no `with()`,
 * no `eval()`.
 */
function jsFallbackEvaluate(
  expr: string,
  bindings: Record<string, unknown>,
): unknown {
  const ids = extractIdentifiers(expr)
  const paramNames: string[] = []
  const paramValues: unknown[] = []

  for (const id of ids) {
    paramNames.push(id)
    try {
      paramValues.push(bindings[id])
    } catch {
      paramValues.push(undefined)
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(
      ...paramNames,
      `"use strict"; return (${expr})`,
    )
    const result: unknown = fn(...paramValues)

    // Suppress async results — safeEvaluate is a synchronous API.
    // Without this, a rejected Promise escapes the try/catch and
    // becomes an unhandled rejection (e.g. ERR_VM_DYNAMIC_IMPORT).
    if (result instanceof Promise) {
      result.catch(() => { })
      return undefined
    }

    return result
  } catch {
    return undefined
  }
}

/** 
/*  expr-eval (sandboxed, no code generation)                 
/*    Handles: arithmetic, comparisons, boolean logic, function
/*    calls, simple property access, ternaries.                       
/*    Throws on: undefined variables, arrow syntax, assignments.      
/*                                                                    
/*  JS fallback (Function constructor, explicit params)       
/*    ONLY activated for arrow-callback method chains.                
/*    Handles: .filter(x => ...), .map(x => ...), .reduce(...)        
/*    Blocked for: import(), standalone assignments, all other         
/*    patterns that don't need JS-specific syntax.    
**/

function safeEvaluate(
  expr: string,
  bindings: Record<string, unknown>,
): unknown {
  const sanitized = sanitizeExpr(expr)
  if (!sanitized.trim()) return undefined
  if (isPureJsSyntax(sanitized)) return undefined

  // expr-eval — safe sandbox, no code generation
  try {
    return parser
      .parse(normalizeForExprEval(sanitized))
      .evaluate(bindings as ExprBindings)
  } catch {
    // expr-eval failed — undefined variable, parse error, or
    // unsupported syntax. Check if JS fallback is appropriate.
  }

  // JS fallback — only for arrow-callback method chains
  if (ARROW_CHAIN_RE.test(sanitized) && !DANGEROUS_JS_RE.test(sanitized)) {
    return jsFallbackEvaluate(sanitized, bindings)
  }

  // All other failures: unknown variable, assignment syntax,
  // reserved-word collisions, etc. — return undefined.
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
      return typeof key === 'string' && isKnownKey(tree, key)
    },
  })
}

export function createScope(
  props: Record<string, unknown>,
  signalDefs: Record<string, unknown> = {},
  computedDefs: Record<string, string | unknown> = {},
  methodDefs: Record<string, string> = {},
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
    has(target, key) {
      return typeof key === 'string' && key in target
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
      const child = new Proxy(
        Object.create(null) as Record<string, unknown>,
        {
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
            return key in localProps || key in (ctx as object)
          },
        },
      )
      return createRenderScope(child, interpolationPrefix)
    },
  }
}