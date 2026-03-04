/** @EiderScript.Directives.VBind - Dynamic prop/attr binding via :prop=expr */
import type { Scope } from '../runtime/scope.js'

/** @EiderScript.Directives.VBind - Normalises :class bindings */
function normaliseClass(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter(Boolean).join(' ')
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, boolean>)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
      .join(' ')
  }
  return String(value ?? '')
}

/** @EiderScript.Directives.VBind - Evaluates single :propName=expr binding */
export function compileVBind(propName: string, expr: string, scope: Scope): Record<string, unknown> {
  try {
    const evaluated = scope.evaluate(expr)
    if (propName === 'class') return { class: normaliseClass(evaluated) }
    return { [propName]: evaluated }
  } catch {
    return { [propName]: undefined }
  }
}

/** @EiderScript.Directives.VBind - Evaluates spread v-bind (no prop name) */
export function compileVBindSpread(expr: string, scope: Scope): Record<string, unknown> {
  try {
    const evaluated = scope.evaluate(expr)
    if (typeof evaluated === 'object' && evaluated !== null) {
      return evaluated as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}
