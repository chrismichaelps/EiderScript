/** @EiderScript.Directives.VSlot - Slot content distribution for component composition */
import type { Scope } from '../runtime/scope.js'

export interface SlotContent {
  name: string
  props: Record<string, unknown>
  fallback?: unknown
}

/** @EiderScript.Directives.VSlot - Compiles v-slot directive */
export function compileVSlot(
  slotName: string = 'default',
  scope?: Scope,
  propsExpr?: string,
  fallbackNode?: unknown,
): SlotContent {
  const props: Record<string, unknown> = {}

  if (propsExpr && scope) {
    try {
      const propsValue = scope.evaluate(propsExpr)
      if (typeof propsValue === 'object' && propsValue !== null) {
        Object.assign(props, propsValue as Record<string, unknown>)
      }
    } catch {
      // Props evaluation failed, continue with empty props
    }
  }

  return {
    name: slotName,
    props,
    fallback: fallbackNode,
  }
}
