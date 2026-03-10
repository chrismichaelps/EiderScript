/** @EiderScript.Directives.VFor: v-for list rendering directive */
import { h } from 'vue'
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import type { TemplateCompilerConfig } from '../compiler/template.compiler.js'

/** Parse "item in list" or "(item, index) in list" expressions */
function parseVForExpr(expr: string): {
  itemVar: string
  indexVar: string | null
  listExpr: string
} {
  const trimmed = expr.trim()
  const inIdx = trimmed.lastIndexOf(' in ')
  if (inIdx === -1) return { itemVar: 'item', indexVar: null, listExpr: trimmed }

  const iterPart = trimmed.slice(0, inIdx).trim()
  const listExpr = trimmed.slice(inIdx + 4).trim()

  if (iterPart.startsWith('(') && iterPart.endsWith(')')) {
    const inner = iterPart.slice(1, -1).split(',').map((s) => s.trim())
    return { itemVar: inner[0] ?? 'item', indexVar: inner[1] ?? null, listExpr }
  }

  return { itemVar: iterPart, indexVar: null, listExpr }
}

/** Compiles v-for into a list of keyed VNodes */
export function compileVFor(
  expr: string,
  children: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
  compileNode: (node: unknown, scope: Scope, config: TemplateCompilerConfig) => VNode | string | null,
): VNode[] {
  const { itemVar, indexVar, listExpr } = parseVForExpr(expr)

  let list: unknown[]
  try {
    const raw = scope.evaluate(listExpr)
    if (raw == null) return []
    list = Array.isArray(raw) ? raw : Object.values(raw as Record<string, unknown>)
  } catch {
    return []
  }

  return list.flatMap((item, idx) => {
    // Build a merged flat proxy for this iteration  
    const iterVars: Record<string, unknown> = {}
    iterVars[itemVar] = item
    if (indexVar) iterVars[indexVar] = idx

    const iterScope = scope.createChild(iterVars)

    try {
      const vnode = compileNode(children, iterScope, config)
      if (vnode === null) return [] as VNode[]
      if (typeof vnode === 'string') return [h('span', { key: idx }, vnode)] as VNode[]
      // Clone the node with a unique key to maintain state
      return [h(vnode.type as string, { ...vnode.props, key: idx }, vnode.children ?? undefined)] as VNode[]
    } catch {
      return [] as VNode[]
    }
  })
}
