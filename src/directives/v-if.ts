/** @EiderScript.Directives.VIf - v-if / v-else-if / v-else conditional rendering */
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import type { TemplateCompilerConfig } from '../compiler/template.compiler.js'

export type VIfDirective = 'v-if' | 'v-else-if' | 'v-else'

export interface VIfBranch {
  directive: VIfDirective
  condition?: string
  node: unknown
}

/** @EiderScript.Directives.VIf - Evaluates a single v-if condition */
export function compileVIf(
  condition: string,
  node: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
  compileNode: (node: unknown, scope: Scope, config: TemplateCompilerConfig) => VNode | string | null,
): VNode | null {
  try {
    const result = scope.evaluate(condition)
    if (!result) return null
    const vnode = compileNode(node, scope, config)
    return typeof vnode === 'string' ? null : vnode
  } catch {
    return null
  }
}

/** @EiderScript.Directives.VIf - Evaluates a v-if / v-else-if / v-else chain */
export function compileVIfChain(
  branches: VIfBranch[],
  scope: Scope,
  config: TemplateCompilerConfig,
  compileNode: (node: unknown, scope: Scope, config: TemplateCompilerConfig) => VNode | string | null,
): VNode | null {
  for (const branch of branches) {
    if (branch.directive === 'v-else') {
      const vnode = compileNode(branch.node, scope, config)
      return typeof vnode === 'string' ? null : vnode
    }

    const condition = branch.condition ?? 'false'
    try {
      const result = scope.evaluate(condition)
      if (result) {
        const vnode = compileNode(branch.node, scope, config)
        return typeof vnode === 'string' ? null : vnode
      }
    } catch {
      // falsy on error — continue to next branch
    }
  }
  return null
}
