/** @EiderScript.Runtime.Filters - Built-in template filter/pipe registry
 *
 * Usage in templates:
 *   {{ value | capitalize }}
 *   {{ amount | currency:'USD' }}
 *   {{ items | join:', ' }}
 *   {{ str | truncate:80 }}
 *
 * Pipe syntax: {{ expr | filterName }} or {{ expr | filterName:arg1:arg2 }}
 * Multiple pipes chain left to right: {{ str | trim | capitalize }}
 *
 * IMPORTANT: `|` inside a boolean expression (||) is NOT a pipe.
 * Detection rule: a pipe `|` is only recognized when surrounded by word chars
 * or spaces matching /\s*\|\s*([a-z][a-z0-9_]*)/ after the expression.
 */

export type FilterFn = (value: unknown, ...args: string[]) => unknown

/** @EiderScript.Runtime.Filters — All 13 built-in filters */
const FILTERS: Record<string, FilterFn> = {
  /** Capitalize first letter */
  capitalize: (v) => {
    const s = String(v ?? '')
    return s.charAt(0).toUpperCase() + s.slice(1)
  },

  /** ALL CAPS */
  upper: (v) => String(v ?? '').toUpperCase(),

  /** all lowercase */
  lower: (v) => String(v ?? '').toLowerCase(),

  /** Trim whitespace */
  trim: (v) => String(v ?? '').trim(),

  /** Truncate string with ellipsis: | truncate:80 */
  truncate: (v, len = '80') => {
    const s = String(v ?? '')
    const n = Number(len)
    return s.length <= n ? s : `${s.slice(0, n)}…`
  },

  /** Format as currency: | currency:'USD' or | currency */
  currency: (v, code = 'USD') => {
    const n = Number(v ?? 0)
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
      }).format(n)
    } catch {
      return `${code} ${n.toFixed(2)}`
    }
  },

  /** Format number: | number:2 */
  number: (v, decimals = '0') => {
    const n = Number(v ?? 0)
    return n.toFixed(Number(decimals))
  },

  /** Join array: | join:', ' */
  join: (v, sep = ', ') => {
    if (!Array.isArray(v)) return String(v ?? '')
    return v.join(sep)
  },

  /** Reverse an array (non-mutating) */
  reverse: (v) => {
    if (!Array.isArray(v)) return v
    return [...v].reverse()
  },

  /** First element of array */
  first: (v) => {
    if (!Array.isArray(v)) return v
    return v[0]
  },

  /** Last element of array */
  last: (v) => {
    if (!Array.isArray(v)) return v
    return v[v.length - 1]
  },

  /** JSON serialize */
  json: (v) => {
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  },

  /** Fallback when null/undefined: | default:'N/A' */
  default: (v, fallback = '') => {
    return v == null || v === '' ? fallback : v
  },
}

/** Parses a pipe segment like `capitalize` or `currency:'USD'` or `join: | ` */
function parsePipeSegment(segment: string): { name: string; args: string[] } {
  const colonIdx = segment.indexOf(':')
  if (colonIdx === -1) return { name: segment.trim(), args: [] }
  const name = segment.slice(0, colonIdx).trim()
  // Split the remaining args by `:` but preserve internal whitespace.
  // Only strip surrounding single/double quotes — NOT whitespace — so that
  // a separator like ` | ` is preserved verbatim.
  const args = segment
    .slice(colonIdx + 1)
    .split(':')
    .map((a) => a.replace(/^['"]|['"]$/g, ''))
  return { name, args }
}

/** Applies a chain of filters to a resolved value.
 *  @param value The already-evaluated expression result
 *  @param pipes Array of pipe segment strings (e.g. `['capitalize', 'truncate:40']`)
 */
export function applyFilters(value: unknown, pipes: string[]): unknown {
  let result: unknown = value
  for (const pipe of pipes) {
    const { name, args } = parsePipeSegment(pipe)
    const fn = FILTERS[name]
    if (fn) {
      result = fn(result, ...args)
    }
    // Unknown filter: pass-through silently (graceful degradation)
  }
  return result
}

/** Splits a raw interpolation expression string into (baseExpr, pipes[]).
 *  Only splits on `|` that is NOT followed immediately by another `|` (i.e. not `||`).
 *  Example: `"count > 0 || show | capitalize"` becomes `["count > 0 || show", ["capitalize"]]`
 */
export function splitPipeExpr(raw: string): { expr: string; pipes: string[] } {
  // Split on single `|` (not `||`), from right-to-left so we don't consume `||`
  const parts: string[] = []
  let current = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '|' && raw[i + 1] !== '|' && raw[i - 1] !== '|') {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current.trim())

  const [expr, ...pipes] = parts
  return { expr: expr ?? raw.trim(), pipes: pipes.filter(Boolean) }
}

/** Returns a copy of the FILTERS registry (for testing/extension). */
export function getFilters(): Readonly<Record<string, FilterFn>> {
  return FILTERS
}
