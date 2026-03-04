/** @EiderScript.Directives.VText - Update element textContent safely */
import type { Scope } from '../runtime/scope.js'

/** @EiderScript.Directives.VText - Converts value to safe text string */
function toTextValue(value: unknown): string {
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

/** @EiderScript.Directives.VText - Compiles v-text directive */
export function compileVText(expr: string, scope: Scope): string {
  try {
    const value = scope.evaluate(expr)
    return toTextValue(value)
  } catch {
    return ''
  }
}
