/** @EiderScript.Directives.VShow - CSS display toggle, keeps DOM mounted */
import type { Scope } from '../runtime/scope.js'

/** @EiderScript.Directives.VShow - Returns partial style props for display toggling */
export function compileVShow(
  condition: string,
  scope: Scope,
): { style: { display: string } } {
  try {
    const result = scope.evaluate(condition)
    return { style: { display: result ? '' : 'none' } }
  } catch {
    return { style: { display: 'none' } }
  }
}
