/** @EiderScript.Directives.VMemo - Skips re-render if dependency values unchanged */
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import type { TemplateCompilerConfig } from '../compiler/template.compiler.js'

/** @EiderScript.Directives.VMemo - Compiles v-memo for conditional rendering based on deps */
export function compileVMemo(
  depsExpr: string,
  node: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
  compileNode: (
    node: unknown,
    scope: Scope,
    config: TemplateCompilerConfig,
  ) => VNode | string | null,
): VNode | null {
  const depsValue = scope.evaluate(depsExpr)
  if (depsValue === undefined) {
    return null
  }

  try {
    const vnode = compileNode(node, scope, config)
    if (vnode === null || typeof vnode === 'string') return null
    return vnode
  } catch {
    return null
  }
}
