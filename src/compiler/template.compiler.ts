/** @EiderScript.Compiler.Template - YAML template tree → Vue h() VNode tree */
import { h } from 'vue'
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'

/** @EiderScript.Compiler.Template - Parsed tag descriptor */
interface TagDescriptor {
  tag: string
  attrs: Record<string, unknown>
  on: Record<string, () => void>
  directives: { vIf?: string; vFor?: string; vModel?: string }
}

const DIRECTIVE_RE = /^(v-if|v-for|v-model|@\w[\w.]*|:\w[\w-]*)$/

/** @EiderScript.Compiler.Template - Parses "tag .class #id attr=val @ev=fn" key */
function parseTagKey(key: string, scope: Scope): TagDescriptor {
  const parts = key.trim().split(/\s+/)
  const tag = parts[0] ?? 'div'
  const attrs: Record<string, unknown> = {}
  const on: Record<string, () => void> = {}
  const directives: TagDescriptor['directives'] = {}

  for (const part of parts.slice(1)) {
    if (part.startsWith('@')) {
      const [event, ...rest] = part.slice(1).split('=')
      const handlerName = rest.join('=')
      on[event ?? ''] = () => scope.methods[handlerName ?? '']?.()
    } else if (part.startsWith(':')) {
      const [attrName, ...rest] = part.slice(1).split('=')
      attrs[attrName ?? ''] = scope.evaluate(rest.join('='))
    } else if (part.startsWith('v-if=')) {
      directives.vIf = part.slice(5)
    } else if (part.startsWith('v-for=')) {
      directives.vFor = part.slice(6)
    } else if (part.startsWith('v-model=')) {
      directives.vModel = part.slice(8)
    } else if (part.includes('=')) {
      const eqIdx = part.indexOf('=')
      const attrName = part.slice(0, eqIdx)
      const attrVal = part.slice(eqIdx + 1)
      if (!DIRECTIVE_RE.test(part)) attrs[attrName] = attrVal
    } else if (part.startsWith('.')) {
      const existing = (attrs['class'] as string | undefined) ?? ''
      attrs['class'] = `${existing} ${part.slice(1)}`.trim()
    } else if (part.startsWith('#')) {
      attrs['id'] = part.slice(1)
    } else {
      attrs[part] = true
    }
  }

  return { tag, attrs, on, directives }
}

/** @EiderScript.Compiler.Template - Interpolates {{ expr }} in text */
function interpolate(text: string, scope: Scope): string {
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, expr: string) => {
    return String(scope.evaluate(expr.trim()) ?? '')
  })
}

/** @EiderScript.Compiler.Template - Converts a YAML template node → VNode */
export function compileNode(node: unknown, scope: Scope): VNode | string | null {
  if (typeof node === 'string') return interpolate(node, scope)
  if (typeof node !== 'object' || node === null) return String(node)

  const entries = Object.entries(node as Record<string, unknown>)
  if (entries.length === 0) return null

  const vnodes: Array<VNode | string> = []

  for (const [key, value] of entries) {
    const { tag, attrs, on, directives } = parseTagKey(key, scope)

    if (directives.vIf !== undefined) {
      const cond = scope.evaluate(directives.vIf)
      if (!cond) continue
    }

    const onObj: Record<string, () => void> = {}
    for (const [ev, fn] of Object.entries(on)) {
      onObj[`on${ev.charAt(0).toUpperCase()}${ev.slice(1)}`] = fn
    }

    const props = { ...attrs, ...onObj }

    const children: VNode[] | string | undefined =
      typeof value === 'string'
        ? interpolate(value, scope)
        : typeof value === 'object' && value !== null
          ? (() => {
            const nested = compileNode(value, scope)
            return nested !== null ? [nested as VNode] : []
          })()
          : undefined

    vnodes.push(h(tag, props, children))
  }

  return vnodes.length === 1
    ? (vnodes[0] as VNode | string)
    : h('template', {}, vnodes)
}
