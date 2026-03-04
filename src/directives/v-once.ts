/** @EiderScript.Directives.VOnce - Renders element once, never re-renders */
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import type { TemplateCompilerConfig } from '../compiler/template.compiler.js'

/** @EiderScript.Directives.VOnce - Compiles v-once directive for static rendering */
export function compileVOnce(
  node: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
  compileNode: (node: unknown, scope: Scope, config: TemplateCompilerConfig) => VNode | string | null,
): VNode | null {
  const vnode = compileNode(node, scope, config)
  if (vnode === null || typeof vnode === 'string') return null
  return vnode
}
