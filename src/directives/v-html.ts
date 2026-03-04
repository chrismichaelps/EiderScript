/** @EiderScript.Directives.VHtml - Update element innerHTML with sanitization consideration */
import type { Scope } from '../runtime/scope.js'

/** @EiderScript.Directives.VHtml - Converts value to HTML string safely */
function toHtmlValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

/** @EiderScript.Directives.VHtml - Compiles v-html directive */
export function compileVHtml(expr: string, scope: Scope): string {
  try {
    const value = scope.evaluate(expr)
    return toHtmlValue(value)
  } catch {
    return ''
  }
}
