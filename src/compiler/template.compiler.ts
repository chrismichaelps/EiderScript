/** @EiderScript.Compiler.Template - YAML template tree → Vue h() VNode tree */
import { h } from 'vue'
import type { VNode } from 'vue'
import type { Scope } from '../runtime/scope.js'
import { Regex, Tags } from '../config/constants.js'
import { compileVFor } from '../directives/v-for.js'
import { compileVIf, compileVIfChain } from '../directives/v-if.js'
import type { VIfBranch } from '../directives/v-if.js'
import { compileVModel } from '../directives/v-model.js'
import { compileVShow } from '../directives/v-show.js'
import { compileVBind, compileVBindSpread } from '../directives/v-bind.js'
import { compileVOnce } from '../directives/v-once.js'
import { compileVPre } from '../directives/v-pre.js'
import { compileVMemo } from '../directives/v-memo.js'
import { compileVCloak } from '../directives/v-cloak.js'
import { applyFilters, splitPipeExpr } from '../runtime/filters.js'

export interface TemplateCompilerConfig {
  dirIf: string
  dirFor: string
  dirModel: string
  defaultHtmlTag: string
  fragmentHtmlTag: string
  directiveRe: RegExp
}

/** @EiderScript.Compiler.Template - Valid directive names */
const VALID_DIRECTIVES = new Set([
  'v-if',
  'v-else-if',
  'v-else',
  'v-for',
  'v-model',
  'v-show',
  'v-bind',
  'v-once',
  'v-pre',
  'v-memo',
  'v-cloak',
])

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
    vElseIf?: string
    vElse?: boolean
    vOnce?: boolean
    vPre?: boolean
    vMemo?: string
    vCloak?: boolean
  }
}

/** @EiderScript.Compiler.Template - Validates directive key, throws on unknown */
function validateDirective(key: string, value: unknown): void {
  if (key.startsWith('v-')) {
    const directiveName = key.includes('=')
      ? key.slice(0, key.indexOf('='))
      : key
    if (!VALID_DIRECTIVES.has(directiveName)) {
      throw new Error(
        `${Tags.COMPILE_ERROR}: Unknown directive "${directiveName}"`,
      )
    }
  }
}

/** @EiderScript.Compiler.Template - Parses "tag .class #id attr=val @ev=fn :prop=expr" key */
function parseTagKey(
  key: string,
  scope: Scope,
  config: TemplateCompilerConfig,
): TagDescriptor {
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
        Object.assign(attrs, compileVBindSpread(expr, scope))
      } else {
        Object.assign(attrs, compileVBind(propName, expr, scope))
      }
    } else if (part.startsWith(`${config.dirIf}=`)) {
      directives.vIf = part.slice(config.dirIf.length + 1)
    } else if (part.startsWith('v-else-if=')) {
      directives.vElseIf = part.slice('v-else-if='.length)
    } else if (part === 'v-else') {
      directives.vElse = true
    } else if (part.startsWith(`${config.dirFor}=`)) {
      directives.vFor = part.slice(config.dirFor.length + 1)
    } else if (part.startsWith(`${config.dirModel}=`)) {
      directives.vModel = part.slice(config.dirModel.length + 1)
    } else if (part.startsWith('v-show=')) {
      directives.vShow = part.slice('v-show='.length)
    } else if (part.startsWith('v-bind=')) {
      directives.vBindSpread = part.slice('v-bind='.length)
    } else if (part === 'v-once') {
      directives.vOnce = true
    } else if (part === 'v-pre') {
      directives.vPre = true
    } else if (part.startsWith('v-memo=')) {
      directives.vMemo = part.slice('v-memo='.length)
    } else if (part === 'v-cloak') {
      directives.vCloak = true
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

/** @EiderScript.Compiler.Template - Interpolates {{ expr }} and {{ expr | filter }} in text */
export function interpolate(text: string, scope: Scope): string {
  return text.replace(Regex.INTERPOLATION, (_, rawExpr: string) => {
    const { expr, pipes } = splitPipeExpr(rawExpr.trim())
    const value = scope.evaluate(expr)
    const result = pipes.length > 0 ? applyFilters(value, pipes) : value
    return String(result ?? '')
  })
}

/** @EiderScript.Compiler.Template - Converts a YAML template node → VNode
 *
 * Special reserved keys:
 *   `text:` → emitted as interpolated text child, not an element
 *   `attrs:` → merged into parent element attributes (inline YAML attrs block)
 */
export function compileNode(
  node: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
): VNode | string | null {
  if (typeof node === 'string') return interpolate(node, scope)
  if (typeof node !== 'object' || node === null) return String(node)

  const entries = Object.entries(node as Record<string, unknown>)
  if (entries.length === 0) return null

  const vnodes: Array<VNode | string> = []

  // Pre-pass: group v-if / v-else-if / v-else chains
  // We convert them to a grouped structure so compileVIfChain can handle them.
  // All other entries pass through unchanged.
  type GroupedEntry =
    | { kind: 'ifChain'; branches: VIfBranch[] }
    | { kind: 'single'; key: string; value: unknown }

  const grouped: GroupedEntry[] = []
  let i = 0
  while (i < entries.length) {
    const [key, value] = entries[i]!
    const firstTag = key.trim().split(/\s+/)[0] ?? ''

    // Validate directive keys (except text: and attrs:)
    if (firstTag !== 'text' && firstTag !== 'attrs') {
      const tagParts = key.trim().split(/\s+/)
      for (const part of tagParts) {
        if (part.startsWith('v-')) {
          const directiveName = part.includes('=')
            ? part.slice(0, part.indexOf('='))
            : part
          if (!VALID_DIRECTIVES.has(directiveName)) {
            throw new Error(
              `${Tags.COMPILE_ERROR}: Unknown directive "${directiveName}"`,
            )
          }
        }
      }
    }

    // Skip `text:` and `attrs:` from chain grouping — handle later
    if (firstTag === 'text' || firstTag === 'attrs') {
      grouped.push({ kind: 'single', key, value })
      i++
      continue
    }

    // Detect v-if start
    const hasVIf = key.includes(`${config.dirIf}=`)
    if (hasVIf) {
      const desc = parseTagKey(key, scope, config)
      if (desc.directives.vIf !== undefined) {
        const branches: VIfBranch[] = [
          { directive: 'v-if', condition: desc.directives.vIf, node: value },
        ]
        // Consume following v-else-if / v-else entries
        let j = i + 1
        while (j < entries.length) {
          const [nextKey, nextValue] = entries[j]!
          const nDesc = parseTagKey(nextKey, scope, config)
          if (nDesc.directives.vElseIf !== undefined) {
            branches.push({
              directive: 'v-else-if',
              condition: nDesc.directives.vElseIf,
              node: nextValue,
            })
            j++
          } else if (nDesc.directives.vElse === true) {
            branches.push({ directive: 'v-else', node: nextValue })
            j++
            break // v-else always terminates the chain
          } else {
            break
          }
        }
        grouped.push({ kind: 'ifChain', branches })
        i = j
        continue
      }
    }

    grouped.push({ kind: 'single', key, value })
    i++
  }

  // Main pass: compile grouped entries to VNodes
  for (const entry of grouped) {
    // v-if / v-else-if / v-else chain
    if (entry.kind === 'ifChain') {
      const result = compileVIfChain(entry.branches, scope, config, compileNode)
      if (result !== null) vnodes.push(result)
      continue
    }

    const { key, value } = entry

    // `text:` special key — emit as interpolated text child
    const baseTag = key.trim().split(/\s+/)[0] ?? ''
    if (baseTag === 'text') {
      const textContent =
        typeof value === 'string'
          ? interpolate(value, scope)
          : String(value ?? '')
      if (textContent) vnodes.push(textContent)
      continue
    }

    // `attrs:` special key — skip (handled by parent's parseTagKey)
    if (baseTag === 'attrs') continue

    const { tag, attrs, on, directives } = parseTagKey(key, scope, config)

    // v-for: expand into multiple vnodes
    if (directives.vFor !== undefined) {
      const items = compileVFor(
        directives.vFor,
        value,
        scope,
        config,
        compileNode,
      )
      vnodes.push(...items)
      continue
    }

    const onObj: Record<string, () => void> = {}
    for (const [ev, fn] of Object.entries(on)) {
      onObj[`on${ev.charAt(0).toUpperCase()}${ev.slice(1)}`] = fn
    }

    // Handle inline `attrs:` sub-key for the current element
    let inlineAttrs: Record<string, unknown> = {}
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const valueObj = value as Record<string, unknown>
      if (
        'attrs' in valueObj &&
        typeof valueObj['attrs'] === 'object' &&
        valueObj['attrs'] !== null
      ) {
        inlineAttrs = valueObj['attrs'] as Record<string, unknown>
      }
    }

    // v-model props
    const vModelProps =
      directives.vModel !== undefined
        ? compileVModel(directives.vModel, scope)
        : {}

    // v-show props
    const vShowProps =
      directives.vShow !== undefined
        ? compileVShow(directives.vShow, scope)
        : {}

    // v-bind spread props
    const vBindSpreadProps =
      directives.vBindSpread !== undefined
        ? compileVBindSpread(directives.vBindSpread, scope)
        : {}

    const props = {
      ...attrs,
      ...inlineAttrs,
      ...onObj,
      ...vModelProps,
      ...vShowProps,
      ...vBindSpreadProps,
    }

    // Build children
    const children: Array<VNode | string> | string | undefined = (() => {
      if (typeof value === 'string') {
        return interpolate(value, scope)
      }
      if (typeof value !== 'object' || value === null) {
        return String(value ?? '')
      }
      // Nested object — compile children, filtering out `attrs:` sub-node
      const childEntries = Object.entries(
        value as Record<string, unknown>,
      ).filter(([k]) => k.trim().split(/\s+/)[0] !== 'attrs')
      const childNode = compileNode(
        Object.fromEntries(childEntries),
        scope,
        config,
      )
      return childNode !== null ? [childNode as VNode] : []
    })()

    // v-pre: skip compilation, render raw content
    if (directives.vPre === true && typeof value === 'string') {
      const vPreVNode = compileVPre(value)
      vnodes.push(vPreVNode)
      continue
    }

    let vnode = h(tag, props, children)

    // v-once: mark as static, never re-renders
    if (directives.vOnce === true) {
      vnode = compileVOnce(value, scope, config, compileNode) ?? vnode
    }

    // v-memo: conditional re-render based on deps
    if (directives.vMemo !== undefined) {
      vnode =
        compileVMemo(directives.vMemo, value, scope, config, compileNode) ??
        vnode
    }

    // v-cloak: add cloak attribute
    if (directives.vCloak === true) {
      vnode = compileVCloak(value, scope, config, compileNode) ?? vnode
    }

    vnodes.push(vnode)
  }

  return vnodes.length === 1
    ? (vnodes[0] as VNode | string)
    : h(config.fragmentHtmlTag, {}, vnodes)
}
