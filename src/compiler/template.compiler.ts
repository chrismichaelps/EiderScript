/** @EiderScript.Compiler.Template - YAML template tree → Vue h() VNode tree */
import { h } from 'vue'
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import { Regex } from '../config/constants.js'
import { compileVFor } from '../directives/v-for.js'
import { compileVIf } from '../directives/v-if.js'
import { compileVModel } from '../directives/v-model.js'
import { compileVShow } from '../directives/v-show.js'
import { compileVBind, compileVBindSpread } from '../directives/v-bind.js'

export interface TemplateCompilerConfig {
  dirIf: string
  dirFor: string
  dirModel: string
  defaultHtmlTag: string
  fragmentHtmlTag: string
  directiveRe: RegExp
}

/** @EiderScript.Compiler.Template - Parsed tag descriptor */
interface TagDescriptor {
  tag: string
  attrs: Record<string, unknown>
  on: Record<string, () => void>
  directives: {
    vIf?: string
    vFor?: string
    vModel?: string
    vShow?: string
    vBindSpread?: string
  }
}

/** @EiderScript.Compiler.Template - Parses "tag .class #id attr=val @ev=fn :prop=expr" key */
function parseTagKey(key: string, scope: Scope, config: TemplateCompilerConfig): TagDescriptor {
  const parts = key.trim().split(/\s+/)
  const tag = parts[0] ?? config.defaultHtmlTag
  const attrs: Record<string, unknown> = {}
  const on: Record<string, () => void> = {}
  const directives: TagDescriptor['directives'] = {}

  for (const part of parts.slice(1)) {
    if (part.startsWith('@')) {
      const [event, ...rest] = part.slice(1).split('=')
      const handlerName = rest.join('=')
      on[event ?? ''] = () => scope.methods[handlerName ?? '']?.()
    } else if (part.startsWith(':')) {
      // Dynamic binding: :class, :style, :prop=expr
      const eqIdx = part.indexOf('=')
      if (eqIdx === -1) continue
      const propName = part.slice(1, eqIdx)
      const expr = part.slice(eqIdx + 1)
      if (!propName) {
        // v-bind spread: :=expr
        Object.assign(attrs, compileVBindSpread(expr, scope))
      } else {
        Object.assign(attrs, compileVBind(propName, expr, scope))
      }
    } else if (part.startsWith(`${config.dirIf}=`)) {
      directives.vIf = part.slice(config.dirIf.length + 1)
    } else if (part.startsWith(`${config.dirFor}=`)) {
      directives.vFor = part.slice(config.dirFor.length + 1)
    } else if (part.startsWith(`${config.dirModel}=`)) {
      directives.vModel = part.slice(config.dirModel.length + 1)
    } else if (part.startsWith('v-show=')) {
      directives.vShow = part.slice('v-show='.length)
    } else if (part.startsWith('v-bind=')) {
      directives.vBindSpread = part.slice('v-bind='.length)
    } else if (part.includes('=')) {
      const eqIdx = part.indexOf('=')
      const attrName = part.slice(0, eqIdx)
      const attrVal = part.slice(eqIdx + 1)
      if (!config.directiveRe.test(part)) attrs[attrName] = attrVal
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
  return text.replace(Regex.INTERPOLATION, (_, expr: string) => {
    return String(scope.evaluate(expr.trim()) ?? '')
  })
}

/** @EiderScript.Compiler.Template - Converts a YAML template node → VNode */
export function compileNode(node: unknown, scope: Scope, config: TemplateCompilerConfig): VNode | string | null {
  if (typeof node === 'string') return interpolate(node, scope)
  if (typeof node !== 'object' || node === null) return String(node)

  const entries = Object.entries(node as Record<string, unknown>)
  if (entries.length === 0) return null

  const vnodes: Array<VNode | string> = []

  for (const [key, value] of entries) {
    const { tag, attrs, on, directives } = parseTagKey(key, scope, config)

    // v-if: skip this node if condition is falsy
    if (directives.vIf !== undefined) {
      const result = compileVIf(directives.vIf, value, scope, config, compileNode)
      if (result !== null) vnodes.push(result)
      continue
    }

    // v-for: expand into multiple vnodes
    if (directives.vFor !== undefined) {
      const items = compileVFor(directives.vFor, value, scope, config, compileNode)
      vnodes.push(...items)
      continue
    }

    const onObj: Record<string, () => void> = {}
    for (const [ev, fn] of Object.entries(on)) {
      onObj[`on${ev.charAt(0).toUpperCase()}${ev.slice(1)}`] = fn
    }

    // v-model: merge two-way binding props
    const vModelProps = directives.vModel !== undefined
      ? compileVModel(directives.vModel, scope)
      : {}

    // v-show: merge display style props
    const vShowProps = directives.vShow !== undefined
      ? compileVShow(directives.vShow, scope)
      : {}

    // v-bind spread: merge dynamic props object
    const vBindSpreadProps = directives.vBindSpread !== undefined
      ? compileVBindSpread(directives.vBindSpread, scope)
      : {}

    const props = { ...attrs, ...onObj, ...vModelProps, ...vShowProps, ...vBindSpreadProps }

    const children: VNode[] | string | undefined =
      typeof value === 'string'
        ? interpolate(value, scope)
        : typeof value === 'object' && value !== null
          ? (() => {
            const nested = compileNode(value, scope, config)
            return nested !== null ? [nested as VNode] : []
          })()
          : undefined

    vnodes.push(h(tag, props, children))
  }

  return vnodes.length === 1
    ? (vnodes[0] as VNode | string)
    : h(config.fragmentHtmlTag, {}, vnodes)
}
