/** @EiderScript.Compiler.Template - YAML template tree to Vue h() VNode tree */
import {
  h,
  getCurrentInstance,
  Teleport,
  Suspense,
  KeepAlive,
  Transition,
  TransitionGroup,
  renderSlot,
  resolveDynamicComponent,
  type VNode,
  type Component,
} from 'vue'
import type { Scope } from '../runtime/scope.js'
import { Regex, Tags } from '../config/constants.js'
import { compileVFor } from '../directives/v-for.js'
import { compileVIfChain } from '../directives/v-if.js'
import type { VIfBranch } from '../directives/v-if.js'
import { compileVModel } from '../directives/v-model.js'
import { compileVShow } from '../directives/v-show.js'
import { compileVBind, compileVBindSpread } from '../directives/v-bind.js'
import { compileVOnce } from '../directives/v-once.js'
import { compileVPre } from '../directives/v-pre.js'
import { compileVMemo } from '../directives/v-memo.js'
import { compileVCloak } from '../directives/v-cloak.js'
import { compileVText } from '../directives/v-text.js'
import { compileVHtml } from '../directives/v-html.js'
import { compileVOn } from '../directives/v-on.js'
import { compileVSlot } from '../directives/v-slot.js'
import { applyFilters, splitPipeExpr } from '../runtime/filters.js'

export interface TemplateCompilerConfig {
  dirIf: string
  dirFor: string
  dirModel: string
  defaultHtmlTag: string
  fragmentHtmlTag: string
  directiveRe: RegExp
}

const BUILT_IN_TAG_MAP: Readonly<Record<string, Component>> = {
  teleport: Teleport as unknown as Component,
  suspense: Suspense as unknown as Component,
  keepalive: KeepAlive as unknown as Component,
  'keep-alive': KeepAlive as unknown as Component,
  transition: Transition as unknown as Component,
  transitiongroup: TransitionGroup as unknown as Component,
  'transition-group': TransitionGroup as unknown as Component,
}

/**
 * Resolves a dynamic component safely.
 *
 * `resolveDynamicComponent` internally calls `resolveComponent`,
 * which requires an active Vue instance (render/setup context).
 * Outside that context (SSR compilation, unit tests), we return
 * the raw value — Vue resolves it at mount time.
 */
function safeDynamicComponent(
  is: unknown,
): string | Component {
  if (getCurrentInstance()) {
    return resolveDynamicComponent(is) as string | Component
  }
  // Outside Vue context: return as string tag for deferred resolution
  return typeof is === 'string' ? is : String(is ?? 'div')
}

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
  'v-text',
  'v-html',
  'v-on',
  'v-slot',
])

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
    vText?: string
    vHtml?: string
    vOn?: Record<string, string>
    vSlot?: { name: string; expr?: string }
  }
}

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
    // Event shorthand: @click=handler
    if (part.startsWith('@')) {
      const [event, ...rest] = part.slice(1).split('=')
      const handlerName = rest.join('=')
      on[event ?? ''] = () => scope.methods[handlerName ?? '']?.()

      // Dynamic binding: :prop=expr
    } else if (part.startsWith(':')) {
      const eqIdx = part.indexOf('=')
      if (eqIdx === -1) continue
      const propName = part.slice(1, eqIdx)
      const expr = part.slice(eqIdx + 1)
      if (!propName) {
        Object.assign(attrs, compileVBindSpread(expr, scope))
      } else {
        Object.assign(attrs, compileVBind(propName, expr, scope))
      }

      // v-if
    } else if (part.startsWith(`${config.dirIf}=`)) {
      directives.vIf = part.slice(config.dirIf.length + 1)

      // v-else-if
    } else if (part.startsWith('v-else-if=')) {
      directives.vElseIf = part.slice('v-else-if='.length)

      // v-else
    } else if (part === 'v-else') {
      directives.vElse = true

      // v-for
    } else if (part.startsWith(`${config.dirFor}=`)) {
      directives.vFor = part.slice(config.dirFor.length + 1)

      // v-model
    } else if (part.startsWith(`${config.dirModel}=`)) {
      directives.vModel = part.slice(config.dirModel.length + 1)

      // v-show
    } else if (part.startsWith('v-show=')) {
      directives.vShow = part.slice('v-show='.length)

      // v-bind (spread)
    } else if (part.startsWith('v-bind=')) {
      directives.vBindSpread = part.slice('v-bind='.length)

      // v-once
    } else if (part === 'v-once') {
      directives.vOnce = true

      // v-pre
    } else if (part === 'v-pre') {
      directives.vPre = true

      // v-memo
    } else if (part.startsWith('v-memo=')) {
      directives.vMemo = part.slice('v-memo='.length)

      // v-cloak
    } else if (part === 'v-cloak') {
      directives.vCloak = true

      // v-text
    } else if (part.startsWith('v-text=')) {
      directives.vText = part.slice('v-text='.length)

      // v-html
    } else if (part.startsWith('v-html=')) {
      directives.vHtml = part.slice('v-html='.length)

      // v-on (full syntax)
    } else if (
      part.startsWith('v-on:') ||
      part.startsWith('v-on=')
    ) {
      if (!directives.vOn) directives.vOn = {}
      if (part.startsWith('v-on=')) {
        directives.vOn[''] = part.slice('v-on='.length)
      } else {
        const [eventName, ...rest] = part.slice('v-on:'.length).split('=')
        const expr = rest.join('=')
        if (eventName) directives.vOn[eventName] = expr
      }

      // v-slot (full syntax: v-slot, v-slot=, v-slot:name)
    } else if (
      part === 'v-slot' ||
      part.startsWith('v-slot=') ||
      part.startsWith('v-slot:')
    ) {
      directives.vSlot = { name: 'default' }
      if (part === 'v-slot') {
        // bare v-slot
      } else if (part.startsWith('v-slot=')) {
        directives.vSlot.expr = part.slice('v-slot='.length)
      } else {
        const [slotNameRaw, ...exprRest] = part.slice('v-slot:'.length).split('=')
        let slotName = slotNameRaw || 'default'
        if (slotName.startsWith('[') && slotName.endsWith(']')) {
          try {
            slotName = String(scope.evaluate(slotName.slice(1, -1)))
          } catch {
            slotName = slotName.slice(1, -1)
          }
        }
        directives.vSlot.name = slotName
        if (exprRest.length > 0) directives.vSlot.expr = exprRest.join('=')
      }

      // Slot shorthand: #name or #name=expr
      // Must come AFTER the v-slot checks and BEFORE the #id check
    } else if (part.startsWith('#') && part.includes('=')) {
      // #slotName=expr — slot shorthand with expression
      directives.vSlot = { name: 'default' }
      const [slotNameRaw, ...exprRest] = part.slice(1).split('=')
      let slotName = slotNameRaw || 'default'
      if (slotName.startsWith('[') && slotName.endsWith(']')) {
        try {
          slotName = String(scope.evaluate(slotName.slice(1, -1)))
        } catch {
          slotName = slotName.slice(1, -1)
        }
      }
      directives.vSlot.name = slotName
      directives.vSlot.expr = exprRest.join('=')

      // Class shorthand: .className
    } else if (part.startsWith('.')) {
      const existing = (attrs['class'] as string | undefined) ?? ''
      attrs['class'] = `${existing} ${part.slice(1)}`.trim()

      // ID shorthand: #id
    } else if (part.startsWith('#') && !part.includes('=')) {
      attrs['id'] = part.slice(1)

      // key=value attribute
    } else if (part.includes('=')) {
      const eqIdx = part.indexOf('=')
      const attrName = part.slice(0, eqIdx)
      const attrVal = part.slice(eqIdx + 1)
      if (!config.directiveRe.test(part)) attrs[attrName] = attrVal

      // Boolean attribute
    } else {
      attrs[part] = true
    }
  }

  return { tag, attrs, on, directives }
}

/** Interpolates {{ expr }} and {{ expr | filter }} in text */
export function interpolate(text: string, scope: Scope): string {
  return text.replace(Regex.INTERPOLATION, (_, rawExpr: string) => {
    const { expr, pipes } = splitPipeExpr(rawExpr.trim())
    const value = scope.evaluate(expr)
    const result = pipes.length > 0 ? applyFilters(value, pipes) : value
    return String(result ?? '')
  })
}

/** Converts a YAML template node to VNode */
export function compileNode(
  node: unknown,
  scope: Scope,
  config: TemplateCompilerConfig = {
    dirIf: 'v-if',
    dirFor: 'v-for',
    dirModel: 'v-model',
    defaultHtmlTag: 'div',
    fragmentHtmlTag: 'template',
    directiveRe: Regex.DIRECTIVE,
  },
): VNode | string | null {
  if (typeof node === 'string') return interpolate(node, scope)
  if (typeof node !== 'object' || node === null) return String(node)

  const entries = Object.entries(node as Record<string, unknown>)
  if (entries.length === 0) return null

  const vnodes: Array<VNode | string> = []

  // Pre-pass: group v-if / v-else-if / v-else chains
  type GroupedEntry =
    | { kind: 'ifChain'; branches: VIfBranch[] }
    | { kind: 'single'; key: string; value: unknown }

  const grouped: GroupedEntry[] = []
  let i = 0
  while (i < entries.length) {
    const [key, value] = entries[i]!
    const firstTag = key.trim().split(/\s+/)[0] ?? ''

    // Validate directive keys
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

    // Skip `text:` and `attrs:` from chain grouping
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
            break
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
    if (entry.kind === 'ifChain') {
      const result = compileVIfChain(
        entry.branches,
        scope,
        config,
        compileNode,
      )
      if (result !== null) vnodes.push(result)
      continue
    }

    const { key, value } = entry

    const baseTag = key.trim().split(/\s+/)[0] ?? ''

    // `text:` special key
    if (baseTag === 'text') {
      const textContent =
        typeof value === 'string'
          ? interpolate(value, scope)
          : String(value ?? '')
      if (textContent) vnodes.push(textContent)
      continue
    }

    // `attrs:` special key
    if (baseTag === 'attrs') continue

    const { tag, attrs, on, directives } = parseTagKey(key, scope, config)

    // v-for
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

    // Normalise event handlers
    const onObj: Record<string, () => void> = {}
    for (const [ev, fn] of Object.entries(on)) {
      onObj[`on${ev.charAt(0).toUpperCase()}${ev.slice(1)}`] = fn
    }

    // Inline attrs: sub-key
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

    // Directive props
    const vModelProps =
      directives.vModel !== undefined
        ? compileVModel(directives.vModel, scope)
        : {}

    const vShowProps =
      directives.vShow !== undefined
        ? compileVShow(directives.vShow, scope)
        : {}

    const vBindSpreadProps =
      directives.vBindSpread !== undefined
        ? compileVBindSpread(directives.vBindSpread, scope)
        : {}

    const vOnHandlers: Record<string, unknown> = {}
    if (directives.vOn) {
      for (const [evtName, expr] of Object.entries(directives.vOn)) {
        Object.assign(vOnHandlers, compileVOn(evtName, expr, scope))
      }
    }

    const props: Record<string, unknown> = {
      ...attrs,
      ...inlineAttrs,
      ...onObj,
      ...vOnHandlers,
      ...vModelProps,
      ...vShowProps,
      ...vBindSpreadProps,
    }

    // Build children
    let children: Array<VNode | string> | string | undefined = undefined

    if (directives.vHtml !== undefined) {
      const htmlContent = compileVHtml(directives.vHtml, scope)
      props['innerHTML'] = htmlContent
    } else if (directives.vText !== undefined) {
      children = compileVText(directives.vText, scope)
    } else if (directives.vSlot !== undefined) {
      const slotDef = compileVSlot(
        directives.vSlot.name,
        scope,
        directives.vSlot.expr,
      )
      props['data-eider-slot'] = slotDef.name
      if (directives.vSlot.expr) {
        props['data-eider-slot-expr'] = directives.vSlot.expr
      }
    }

    if (!children && directives.vHtml === undefined) {
      if (typeof value === 'string') {
        children = interpolate(value, scope)
      } else if (typeof value !== 'object' || value === null) {
        children = String(value ?? '')
      } else {
        const childEntries = Object.entries(
          value as Record<string, unknown>,
        ).filter(([k]) => k.trim().split(/\s+/)[0] !== 'attrs')
        const childNode = compileNode(
          Object.fromEntries(childEntries),
          scope,
          config,
        )
        children = childNode !== null ? [childNode as VNode] : []
      }
    }

    // v-pre: render raw
    if (directives.vPre === true && typeof value === 'string') {
      vnodes.push(compileVPre(value))
      continue
    }

    // Resolve tag and create VNode
    let vnode: VNode
    const lowerTag = tag.toLowerCase()

    if (lowerTag === 'slot') {
      const slotName = String(props.name ?? 'default')
      delete props['name']
      const slotsObj = (scope.evaluate('$slots') || {}) as Record<
        string,
        import('vue').Slot
      >
      vnode = renderSlot(
        slotsObj,
        slotName,
        props,
        children
          ? () =>
            children as unknown as import('vue').VNodeArrayChildren
          : undefined,
      )
    } else if (lowerTag === 'component') {
      const isVal = props.is
      delete props['is']
      const resolved = safeDynamicComponent(isVal)
      vnode = h(
        resolved,
        props,
        children as unknown as import('vue').VNodeArrayChildren,
      )
    } else {
      const resolved = BUILT_IN_TAG_MAP[lowerTag] ?? tag
      vnode = h(
        resolved as string | Component,
        props,
        children as unknown as import('vue').VNodeArrayChildren,
      )
    }

    // Post-processing directives
    if (directives.vOnce === true) {
      vnode = compileVOnce(value, scope, config, compileNode) ?? vnode
    }

    if (directives.vMemo !== undefined) {
      vnode =
        compileVMemo(directives.vMemo, value, scope, config, compileNode) ??
        vnode
    }

    if (directives.vCloak === true) {
      vnode = compileVCloak(value, scope, config, compileNode) ?? vnode
    }

    vnodes.push(vnode)
  }

  return vnodes.length === 1
    ? (vnodes[0] as VNode | string)
    : h(config.fragmentHtmlTag, {}, vnodes)
}