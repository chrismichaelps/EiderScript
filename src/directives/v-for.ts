/** @EiderScript.Directives.VFor - v-for list rendering directive */
import { h } from 'vue'
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import type { TemplateCompilerConfig } from '../compiler/template.compiler.js'

/** @EiderScript.Directives.VFor - Parse "item in list" or "(item, index) in list" */
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

/** @EiderScript.Directives.VFor - Compiles v-for into a list of keyed VNodes */
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

    const iterScope: Scope = {
      signals: scope.signals,
      computeds: scope.computeds,
      methods: scope.methods,
      props: { ...scope.props, ...iterVars },
      evaluate: (e: string) => {
        try {
          // Use a simple variable substitution for iteration vars
          const allVars: Record<string, unknown> = {}
          for (const [k, r] of Object.entries(scope.signals)) allVars[k] = r.value
          for (const [k, c] of Object.entries(scope.computeds)) allVars[k] = c.value
          Object.assign(allVars, scope.methods, scope.props, iterVars)
          // Delegate to parent evaluate but with iter vars in props fallback
          return scope.evaluate(e)
        } catch {
          return undefined
        }
      },
    }

    try {
      const vnode = compileNode(children, iterScope, config)
      if (vnode === null) return [] as VNode[]
      if (typeof vnode === 'string') return [h('span', { key: idx }, vnode)] as VNode[]
      // Clone with key
      return [h(vnode.type as string, { ...vnode.props, key: idx })] as VNode[]
    } catch {
      return [] as VNode[]
    }
  })
}
