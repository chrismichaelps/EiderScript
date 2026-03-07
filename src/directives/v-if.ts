/** @EiderScript.Directives.VIf — v-if / v-else-if / v-else conditional rendering */
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import type { TemplateCompilerConfig } from '../compiler/template.compiler.js'

export type VIfDirective = 'v-if' | 'v-else-if' | 'v-else'

export interface VIfBranch {
  directive: VIfDirective
  condition?: string
  node: unknown
}

/**
 * Evaluates a single v-if condition.
 *
 * Returns whatever `compileNode` produces (VNode *or* string)
 * when the condition is truthy, `null` otherwise.
 */
export function compileVIf(
  condition: string,
  node: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
  compileNode: (
    node: unknown,
    scope: Scope,
    config: TemplateCompilerConfig,
  ) => VNode | string | null,
): VNode | string | null {
  try {
    if (!scope.evaluate(condition)) return null
    return compileNode(node, scope, config)
  } catch {
    return null
  }
}

/**
 * Evaluates a v-if / v-else-if / v-else chain.
 *
 * Walks branches in order. The first truthy condition (or a bare
 * `v-else`) wins; its node is compiled and returned. If no branch
 * matches, returns `null`.
 */
export function compileVIfChain(
  branches: VIfBranch[],
  scope: Scope,
  config: TemplateCompilerConfig,
  compileNode: (
    node: unknown,
    scope: Scope,
    config: TemplateCompilerConfig,
  ) => VNode | string | null,
): VNode | string | null {
  for (const branch of branches) {
    if (branch.directive === 'v-else') {
      return compileNode(branch.node, scope, config)
    }

    try {
      if (scope.evaluate(branch.condition ?? 'false')) {
        return compileNode(branch.node, scope, config)
      }
    } catch {
      // Treat evaluation error as falsy condition
    }
  }

  return null
}