/** @EiderScript.Directives.VCloak - Removes directive after Vue compiles template */
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import type { TemplateCompilerConfig } from '../compiler/template.compiler.js'

/** @EiderScript.Directives.VCloak - Compiles v-cloak, adds cloak attribute to be removed post-compile */
export function compileVCloak(
  node: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
  compileNode: (node: unknown, scope: Scope, config: TemplateCompilerConfig) => VNode | string | null,
): VNode | null {
  const vnode = compileNode(node, scope, config)
  if (vnode === null || typeof vnode === 'string') return null

  return vnode
}
