/** @EiderScript.Directives.VPre - Skips compilation for element and all children */
import { h, createStaticVNode } from 'vue'
import type { VNode } from 'vue'

/** @EiderScript.Directives.VPre - Compiles v-pre to render raw content */
export function compileVPre(
  content: string,
): VNode {
  return createStaticVNode(content, 1)
}
