/** @EiderScript.Directives.VModel - Two-way signal ↔ input binding */
import type { Scope } from '../runtime/scope.js'

export type InputType = 'text' | 'number' | 'checkbox' | 'radio' | string

/** @EiderScript.Directives.VModel - Produces VNode props for two-way binding */
export function compileVModel(
  signalKey: string,
  scope: Scope,
  inputType: InputType = 'text',
): Record<string, unknown> {
  const signal = scope.signals[signalKey]
  if (!signal) return {}

  const value: unknown = signal.value

  const onInput = (e: Event): void => {
    const target = e.target as HTMLInputElement
    const sig = scope.signals[signalKey]
    if (!sig) return

    if (inputType === 'checkbox') {
      sig.value = target.checked
    } else if (inputType === 'number') {
      const parsed = parseFloat(target.value)
      sig.value = isNaN(parsed) ? 0 : parsed
    } else {
      sig.value = target.value
    }
  }

  if (inputType === 'checkbox') {
    return { checked: Boolean(value), onChange: onInput }
  }

  return { value: value ?? '', onInput }
}
