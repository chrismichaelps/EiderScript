/** @EiderScript.Directives.VModel - Two-way signal ↔ input binding */
import type { Scope } from '../runtime/scope.js'

export type InputType = 'text' | 'number' | 'checkbox' | 'radio' | string

/** @EiderScript.Directives.VModel - Produces VNode props for two-way binding (native inputs) */
export function compileVModel(
  signalKey: string,
  scope: Scope,
  inputType: InputType = 'text',
): Record<string, unknown> {
  const signal = scope.signals[signalKey]
  const canAssign = Boolean(signal || typeof scope.assign === 'function')
  if (!canAssign) return {}

  const getValue = (): unknown =>
    signal ? signal.value : (scope.evaluate(signalKey) ?? '')
  const setValue = (value: unknown): void => {
    if (signal) {
      (signal as { value: unknown }).value = value
      return
    }
    if (typeof scope.assign === 'function') {
      scope.assign(signalKey, value)
    }
  }

  const onInput = (e: Event): void => {
    const target = e.target as HTMLInputElement
    if (inputType === 'checkbox') {
      setValue(target.checked)
    } else if (inputType === 'number') {
      const parsed = parseFloat(target.value)
      setValue(isNaN(parsed) ? 0 : parsed)
    } else {
      setValue(target.value)
    }
  }

  const value = getValue()

  if (inputType === 'checkbox') {
    return { checked: Boolean(value), onChange: onInput }
  }

  return { value: value ?? '', onInput }
}

/** Produces VNode props for component v-model (modelValue + onUpdate:modelValue) */
export function compileVModelComponent(
  signalKey: string,
  scope: Scope,
): Record<string, unknown> {
  const value = scope.evaluate(signalKey)
  if (typeof scope.assign !== 'function') {
    return { modelValue: value ?? '' }
  }
  return {
    modelValue: value ?? '',
    'onUpdate:modelValue': (v: unknown) => scope.assign!(signalKey, v),
  }
}
