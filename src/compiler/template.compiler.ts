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
  Fragment,
  type VNode,
  type Component,
} from 'vue'
import type { Scope } from '../runtime/scope.js'
import { Regex, Tags } from '../config/constants.js'
import { compileVFor } from '../directives/v-for.js'
import { compileVIfChain } from '../directives/v-if.js'
import type { VIfBranch } from '../directives/v-if.js'
import { compileVModel, compileVModelComponent } from '../directives/v-model.js'
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
  fragmentHtmlTag: string | symbol | Component
  directiveRe: RegExp
}

/**
 * Vue's Fragment symbol fails strict assignability to `Component`.
 * A single cast keeps every call-site clean.
 */
const FragmentTag = Fragment as unknown as Component

const BUILT_IN_TAG_MAP: Readonly<Record<string, Component>> = {
  teleport: Teleport as unknown as Component,
  suspense: Suspense as unknown as Component,
  keepalive: KeepAlive as unknown as Component,
  'keep-alive': KeepAlive as unknown as Component,
  transition: Transition as unknown as Component,
  transitiongroup: TransitionGroup as unknown as Component,
  'transition-group': TransitionGroup as unknown as Component,
}

const HTML_TAGS = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b',
  'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas',
  'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd',
  'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i',
  'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link',
  'main', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre',
  'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'search',
  'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub',
  'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea',
  'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul',
  'var', 'video', 'wbr',
])

const VALID_DIRECTIVES = new Set([
  'v-if', 'v-else-if', 'v-else', 'v-for', 'v-model', 'v-show',
  'v-bind', 'v-once', 'v-pre', 'v-memo', 'v-cloak', 'v-text',
  'v-html', 'v-on', 'v-slot',
])

const META_KEYS = new Set([
  'attrs', 'children', 'text', 'class', 'id', 'style', 'ref', 'key',
  'slot', 'v-if', 'v-else-if', 'v-else', 'v-for', 'v-model', 'v-show',
  'v-bind', 'v-once', 'v-pre', 'v-memo', 'v-cloak', 'v-text', 'v-html',
  'v-on', 'v-slot',
])

interface ParsedEvent {
  name: string
  modifiers: string[]
}

function parseEventModifiers(raw: string): ParsedEvent {
  const parts = raw.split('.')
  return { name: parts[0] ?? '', modifiers: parts.slice(1) }
}

function wrapWithModifiers(
  handler: (e?: Event) => void,
  modifiers: string[],
): (e?: Event) => void {
  if (modifiers.length === 0) return handler
  return (e?: Event) => {
    for (const mod of modifiers) {
      if (mod === 'stop') e?.stopPropagation()
      else if (mod === 'prevent') e?.preventDefault()
      else if (mod === 'self' && e && e.target !== e.currentTarget) return
    }
    handler(e)
  }
}

/**
 * Builds a DOM event handler from an expression string.
 *
 * Handles two patterns:
 *   - Bare method name: "addTodo" evaluates to a function, which is then called
 *   - Expression:       "setFilter('all')" evaluates and invokes it inline
 *
 * Uses scope.createChild to inject $event for the handler body.
 */
function buildEventHandler(
  expr: string,
  scope: Scope,
  modifiers: string[] = [],
): (e?: Event) => void {
  const base = (e?: Event) => {
    const childScope = scope.createChild({ $event: e })
    const result = childScope.evaluate(expr)

    // Invoke evaluated result if it resolves to a function.
    if (typeof result === 'function') {
      ; (result as (...args: unknown[]) => unknown)(e)
    }
  }
  return wrapWithModifiers(base, modifiers)
}

/**
 * Converts a raw event name to a Vue prop key: "click" to "onClick"
 */
function toEventProp(eventName: string): string {
  return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
}

function safeDynamicComponent(is: unknown): string | Component {
  if (getCurrentInstance()) {
    return resolveDynamicComponent(is) as string | Component
  }
  return typeof is === 'string' ? is : String(is ?? 'div')
}

/**
 * Resolves a tag name to a Component or string.
 *
 * Priority: built-in map to HTML tags to scope lookup to Vue runtime to raw string.
 */
function resolveTag(tag: string, scope: Scope): string | Component {
  const lower = tag.toLowerCase()

  if (BUILT_IN_TAG_MAP[lower]) return BUILT_IN_TAG_MAP[lower]!
  if (HTML_TAGS.has(lower)) return tag

  // Resolve from scope ($components or direct name)
  try {
    const comp = scope.evaluate(tag)
    if (comp && typeof comp === 'object') return comp as Component
  } catch { /* not found */ }

  // Resolve from active Vue runtime instance
  if (getCurrentInstance()) {
    try {
      const resolved = resolveDynamicComponent(tag)
      if (typeof resolved !== 'string') return resolved as Component
    } catch { /* fall through */ }
  }

  return tag
}

function isMetaKey(k: string, config: TemplateCompilerConfig): boolean {
  const base = k.trim().split(/\s+/)[0] || ''
  if (META_KEYS.has(base)) return true
  if (base === config.dirIf || base === config.dirFor || base === config.dirModel) return true
  if (base.startsWith('v-') || base.startsWith('@') || base.startsWith(':') || base.startsWith('data-')) return true
  return config.directiveRe.test(base)
}

interface Directives {
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

interface TagDescriptor {
  tag: string
  attrs: Record<string, unknown>
  events: Record<string, (e?: Event) => void>
  directives: Directives
}

function parseTagKey(
  key: string,
  scope: Scope,
  config: TemplateCompilerConfig,
): TagDescriptor {
  const parts = key.trim().split(/\s+/)
  const tag = parts[0] ?? config.defaultHtmlTag
  const attrs: Record<string, unknown> = {}
  const events: Record<string, (e?: Event) => void> = {}
  const directives: Directives = {}

  for (const part of parts.slice(1)) {
    if (part.startsWith('@')) {
      const [rawEvent, ...rest] = part.slice(1).split('=')
      const handlerExpr = rest.join('=')
      const { name, modifiers } = parseEventModifiers(rawEvent ?? '')
      events[name] = buildEventHandler(handlerExpr, scope, modifiers)
    } else if (part.startsWith(':')) {
      const eqIdx = part.indexOf('=')
      if (eqIdx === -1) continue
      const propName = part.slice(1, eqIdx)
      const expr = part.slice(eqIdx + 1)
      Object.assign(attrs, propName
        ? compileVBind(propName, expr, scope)
        : compileVBindSpread(expr, scope))
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
    } else if (part.startsWith('v-text=')) {
      directives.vText = part.slice('v-text='.length)
    } else if (part.startsWith('v-html=')) {
      directives.vHtml = part.slice('v-html='.length)
    } else if (part.startsWith('v-on:') || part.startsWith('v-on=')) {
      if (!directives.vOn) directives.vOn = {}
      if (part.startsWith('v-on=')) {
        directives.vOn[''] = part.slice('v-on='.length)
      } else {
        const [evtName, ...rest] = part.slice('v-on:'.length).split('=')
        if (evtName) directives.vOn[evtName] = rest.join('=')
      }
    } else if (part === 'v-slot' || part.startsWith('v-slot=') || part.startsWith('v-slot:')) {
      directives.vSlot = parseSlotDirective(part, scope)
    } else if (part.startsWith('#') && part.includes('=')) {
      directives.vSlot = parseSlotShorthand(part, scope)
    } else if (part.startsWith('.')) {
      const existing = (attrs['class'] as string | undefined) ?? ''
      attrs['class'] = `${existing} ${part.slice(1)}`.trim()
    } else if (part.startsWith('#') && !part.includes('=')) {
      attrs['id'] = part.slice(1)
    } else if (part.includes('=')) {
      const eqIdx = part.indexOf('=')
      const attrName = part.slice(0, eqIdx)
      const attrVal = part.slice(eqIdx + 1)
      if (!config.directiveRe.test(part)) attrs[attrName] = attrVal
    } else {
      attrs[part] = true
    }
  }

  return { tag, attrs, events, directives }
}

function resolveSlotName(raw: string, scope: Scope): string {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try { return String(scope.evaluate(raw.slice(1, -1))) }
    catch { return raw.slice(1, -1) }
  }
  return raw || 'default'
}

function parseSlotDirective(
  part: string,
  scope: Scope,
): { name: string; expr?: string } {
  if (part === 'v-slot') return { name: 'default' }
  if (part.startsWith('v-slot=')) return { name: 'default', expr: part.slice('v-slot='.length) }

  const [nameRaw, ...exprRest] = part.slice('v-slot:'.length).split('=')
  const name = resolveSlotName(nameRaw ?? '', scope)
  return exprRest.length > 0 ? { name, expr: exprRest.join('=') } : { name }
}

function parseSlotShorthand(
  part: string,
  scope: Scope,
): { name: string; expr?: string } {
  const [nameRaw, ...exprRest] = part.slice(1).split('=')
  const name = resolveSlotName(nameRaw ?? '', scope)
  return { name, expr: exprRest.join('=') }
}

/**
 * Compiles the `attrs:` sub-object, resolving `:prop` dynamic bindings
 * and `@event` handlers into their evaluated forms.
 */
function processAttrsBlock(
  raw: Record<string, unknown>,
  scope: Scope,
): { attrs: Record<string, unknown>; events: Record<string, (e?: Event) => void> } {
  const attrs: Record<string, unknown> = {}
  const events: Record<string, (e?: Event) => void> = {}

  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith(':')) {
      const propName = k.slice(1)
      Object.assign(attrs, propName
        ? compileVBind(propName, String(v), scope)
        : compileVBindSpread(String(v), scope))
    } else if (k.startsWith('@')) {
      const { name, modifiers } = parseEventModifiers(k.slice(1))
      events[name] = buildEventHandler(String(v), scope, modifiers)
    } else {
      attrs[k] = v
    }
  }

  return { attrs, events }
}

/**
 * Extracts directives, inline attrs, events, and text content from
 * a value object (the YAML value side of a tag entry).
 */
function processValueObject(
  valueObj: Record<string, unknown>,
  scope: Scope,
  config: TemplateCompilerConfig,
  directives: Directives,
): {
  inlineAttrs: Record<string, unknown>
  inlineEvents: Record<string, (e?: Event) => void>
  textContent: string | undefined
} {
  const inlineAttrs: Record<string, unknown> = {}
  const inlineEvents: Record<string, (e?: Event) => void> = {}
  let textContent: string | undefined

  // Handle attrs sub-block
  if ('attrs' in valueObj && typeof valueObj['attrs'] === 'object' && valueObj['attrs'] !== null) {
    const processed = processAttrsBlock(valueObj['attrs'] as Record<string, unknown>, scope)
    Object.assign(inlineAttrs, processed.attrs)
    Object.assign(inlineEvents, processed.events)
  }

  // Handle text sub-key
  if ('text' in valueObj) {
    textContent = typeof valueObj['text'] === 'string'
      ? interpolate(valueObj['text'], scope)
      : String(valueObj['text'] ?? '')
  }

  // Process directives, bindings, and attributes
  for (const [k, v] of Object.entries(valueObj)) {
    if (k === 'attrs' || k === 'children' || k === 'text') continue
    if (k === config.dirIf || k === 'v-else-if' || k === 'v-else') continue

    if (k === config.dirFor && typeof v === 'string') {
      directives.vFor = v
    } else if (k === config.dirModel && typeof v === 'string') {
      directives.vModel = v
    } else if (k === 'v-show' && typeof v === 'string') {
      directives.vShow = v
    } else if (k === 'v-bind' && typeof v === 'string') {
      directives.vBindSpread = v
    } else if (k === 'v-once') {
      directives.vOnce = true
    } else if (k === 'v-pre') {
      directives.vPre = true
    } else if (k === 'v-memo') {
      directives.vMemo = typeof v === 'string' ? v : ''
    } else if (k === 'v-cloak') {
      directives.vCloak = true
    } else if (k === 'v-text' && typeof v === 'string') {
      directives.vText = v
    } else if (k === 'v-html' && typeof v === 'string') {
      directives.vHtml = v
    } else if (k.startsWith('v-on:') || k === 'v-on') {
      if (!directives.vOn) directives.vOn = {}
      directives.vOn[k === 'v-on' ? '' : k.slice(5)] = String(v)
    } else if (k.startsWith('v-slot:') || k === 'v-slot' || k === 'slot') {
      directives.vSlot = {
        name: k === 'slot' || k === 'v-slot' ? 'default' : k.slice(7),
      }
      if (typeof v === 'string' && v !== '') directives.vSlot.expr = v
    } else if (k.startsWith('@')) {
      const { name, modifiers } = parseEventModifiers(k.slice(1))
      inlineEvents[name] = buildEventHandler(String(v), scope, modifiers)
    } else if (k.startsWith(':')) {
      const propName = k.slice(1)
      Object.assign(inlineAttrs, propName
        ? compileVBind(propName, String(v), scope)
        : compileVBindSpread(String(v), scope))
    } else if (['class', 'id', 'style', 'ref', 'key'].includes(k) || k.startsWith('data-')) {
      inlineAttrs[k] = v
    }
  }

  return { inlineAttrs, inlineEvents, textContent }
}

function buildChildren(
  value: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
  textContent: string | undefined,
): Array<VNode | string> | string | undefined {
  if (typeof value === 'string') return interpolate(value, scope)
  if (typeof value !== 'object' || value === null) return String(value ?? '')

  if (Array.isArray(value)) {
    return value
      .map((n) => compileNode(n, scope, config))
      .filter((n): n is VNode | string => n !== null)
  }

  const obj = value as Record<string, unknown>
  const explicit = obj['children']

  if (explicit !== undefined) {
    const compiled = compileNode(explicit, scope, config)
    const base: Array<VNode | string> = textContent ? [textContent] : []
    if (compiled === null) return base.length > 0 ? base : []
    if (typeof compiled === 'string') return [...base, compiled]
    return [...base, compiled as VNode]
  }

  // Process non-meta keys as implicit children
  const childEntries = Object.entries(obj).filter(([k]) => !isMetaKey(k, config))

  if (childEntries.length > 0) {
    const childNode = compileNode(Object.fromEntries(childEntries), scope, config)
    const base: Array<VNode | string> = textContent ? [textContent] : []
    if (childNode !== null) return [...base, childNode as VNode]
    return base.length > 0 ? base : []
  }

  return textContent ?? undefined
}

function buildDirectiveProps(
  directives: Directives,
  scope: Scope,
  resolvedTag: string | Component,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const isComponent = typeof resolvedTag !== 'string'

  if (directives.vModel !== undefined) {
    Object.assign(
      result,
      isComponent
        ? compileVModelComponent(directives.vModel, scope)
        : compileVModel(directives.vModel, scope),
    )
  }
  if (directives.vShow !== undefined) {
    Object.assign(result, compileVShow(directives.vShow, scope))
  }
  if (directives.vBindSpread !== undefined) {
    Object.assign(result, compileVBindSpread(directives.vBindSpread, scope))
  }
  if (directives.vOn) {
    for (const [evtName, expr] of Object.entries(directives.vOn)) {
      Object.assign(result, compileVOn(evtName, expr, scope))
    }
  }

  return result
}

function createVNode(
  tag: string,
  scope: Scope,
  props: Record<string, unknown>,
  children: Array<VNode | string> | string | undefined,
): VNode {
  const lower = tag.toLowerCase()

  if (lower === 'slot') {
    const slotName = String(props.name ?? 'default')
    delete props['name']
    const slotsObj = (scope.evaluate('$slots') || {}) as Record<string, import('vue').Slot>
    return renderSlot(
      slotsObj,
      slotName,
      props,
      children ? () => children as unknown as import('vue').VNodeArrayChildren : undefined,
    )
  }

  if (lower === 'component') {
    const isVal = props.is
    delete props['is']
    return h(
      safeDynamicComponent(isVal),
      props,
      children as unknown as import('vue').VNodeArrayChildren,
    )
  }

  const resolved = resolveTag(tag, scope)
  return h(
    resolved as string | Component,
    props,
    children as unknown as import('vue').VNodeArrayChildren,
  )
}

function applyPostDirectives(
  vnode: VNode,
  directives: Directives,
  value: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
): VNode {
  let result = vnode

  if (directives.vOnce === true) {
    result = compileVOnce(value, scope, config, compileNode) ?? result
  }
  if (directives.vMemo !== undefined) {
    result = compileVMemo(directives.vMemo, value, scope, config, compileNode) ?? result
  }
  if (directives.vCloak === true) {
    result = compileVCloak(value, scope, config, compileNode) ?? result
  }

  return result
}

/**
 * Matches {{ expr }} including expressions that span multiple lines.
 * Falls back to the configured regex for single-line, uses dotAll for multi-line.
 */
const MULTILINE_INTERPOLATION = /\{\{([\s\S]*?)\}\}/g

/** Interpolates {{ expr }} and {{ expr | filter }} in text */
export function interpolate(text: string, scope: Scope): string {
  return text.replace(MULTILINE_INTERPOLATION, (_, rawExpr: string) => {
    const { expr, pipes } = splitPipeExpr(rawExpr.trim())
    const value = scope.evaluate(expr)
    const result = pipes.length > 0 ? applyFilters(value, pipes) : value
    return String(result ?? '')
  })
}

type GroupedEntry =
  | { kind: 'ifChain'; branches: VIfBranch[] }
  | { kind: 'single'; key: string; value: unknown }

function groupEntries(
  entries: [string, unknown][],
  scope: Scope,
  config: TemplateCompilerConfig,
): GroupedEntry[] {
  const grouped: GroupedEntry[] = []
  let i = 0

  while (i < entries.length) {
    const [key, value] = entries[i]!
    const firstTag = key.trim().split(/\s+/)[0] ?? ''

    // Validate directive existence
    if (firstTag !== 'text' && firstTag !== 'attrs') {
      validateDirectives(key)
    }

    // Retain standalone text and attrs objects
    if (firstTag === 'text' || firstTag === 'attrs') {
      grouped.push({ kind: 'single', key, value })
      i++
      continue
    }

    // Process v-if variants
    const vIfExpr = detectVIf(key, value, scope, config)

    if (vIfExpr !== undefined) {
      const { branches, nextIndex } = collectIfChain(entries, i, vIfExpr, value, scope, config)
      grouped.push({ kind: 'ifChain', branches })
      i = nextIndex
      continue
    }

    grouped.push({ kind: 'single', key, value })
    i++
  }

  return grouped
}

function validateDirectives(key: string): void {
  for (const part of key.trim().split(/\s+/)) {
    if (part.startsWith('v-')) {
      const name = part.includes('=') ? part.slice(0, part.indexOf('=')) : part
      if (!VALID_DIRECTIVES.has(name)) {
        throw new Error(`${Tags.COMPILE_ERROR}: Unknown directive "${name}"`)
      }
    }
  }
}

function detectVIf(
  key: string,
  value: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
): string | undefined {
  if (key.includes(`${config.dirIf}=`)) {
    return parseTagKey(key, scope, config).directives.vIf
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return (value as Record<string, unknown>)[config.dirIf] as string | undefined
  }
  return undefined
}

function collectIfChain(
  entries: [string, unknown][],
  startIndex: number,
  vIfExpr: string,
  value: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
): { branches: VIfBranch[]; nextIndex: number } {
  const branches: VIfBranch[] = [
    { directive: 'v-if', condition: vIfExpr, node: value },
  ]

  let j = startIndex + 1
  while (j < entries.length) {
    const [nextKey, nextValue] = entries[j]!
    const desc = parseTagKey(nextKey, scope, config)

    const elseIfExpr = desc.directives.vElseIf
      ?? extractValueDirective(nextValue, 'v-else-if') as string | undefined

    const hasElse = desc.directives.vElse === true
      || extractValueDirective(nextValue, 'v-else') === true
      || extractValueDirective(nextValue, 'v-else') === ''

    if (elseIfExpr !== undefined) {
      branches.push({ directive: 'v-else-if', condition: elseIfExpr, node: nextValue })
      j++
    } else if (hasElse) {
      branches.push({ directive: 'v-else', node: nextValue })
      j++
      break
    } else {
      break
    }
  }

  return { branches, nextIndex: j }
}

function extractValueDirective(value: unknown, directive: string): unknown {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return (value as Record<string, unknown>)[directive]
  }
  return undefined
}

/**
 * Removes the v-for directive key from a value object.
 * All other keys (child elements, other directives, attrs) are preserved
 * and will be processed when compileNode recurses.
 */
function stripForDirective(
  obj: Record<string, unknown>,
  forDirective: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === forDirective) continue
    result[k] = v
  }
  return result
}

/**
 * Returns true if a base tag name is an orphaned directive/meta key
 * that should never be treated as an HTML tag.
 *
 * This catches keys like `@click`, `:key`, `v-for`, `v-model` that
 * leak through when a directive handler (e.g. compileVFor) passes
 * its raw value object to compileNode without stripping consumed keys.
 */
function isOrphanedDirectiveKey(
  baseTag: string,
  config: TemplateCompilerConfig,
): boolean {
  if (baseTag.startsWith('@') || baseTag.startsWith(':')) return true
  if (
    baseTag.startsWith('v-') &&
    (META_KEYS.has(baseTag) || VALID_DIRECTIVES.has(baseTag))
  ) {
    return true
  }
  if (baseTag === config.dirIf || baseTag === config.dirFor || baseTag === config.dirModel) {
    return true
  }
  return false
}

function compileSingleEntry(
  key: string,
  value: unknown,
  scope: Scope,
  config: TemplateCompilerConfig,
): Array<VNode | string> {
  const baseTag = key.trim().split(/\s+/)[0] ?? ''

  // Handle special text key
  if (baseTag === 'text') {
    const content = typeof value === 'string'
      ? interpolate(value, scope)
      : String(value ?? '')
    return content ? [content] : []
  }

  // Discard attrs consumed by parent processing
  if (baseTag === 'attrs') return []

  // Skip orphaned directive/binding keys (invalid tag names).
  if (isOrphanedDirectiveKey(baseTag, config)) return []

  const { tag, attrs, events, directives } = parseTagKey(key, scope, config)

  // Delegate v-for on tag key
  if (directives.vFor !== undefined) {
    return compileVFor(directives.vFor, value, scope, config, compileNode)
  }

  // Extract event props from tag key
  const eventProps: Record<string, (e?: Event) => void> = {}
  for (const [ev, fn] of Object.entries(events)) {
    eventProps[toEventProp(ev)] = fn
  }

  // Process value object properties
  let inlineAttrs: Record<string, unknown> = {}
  let inlineEventProps: Record<string, (e?: Event) => void> = {}
  let textContent: string | undefined

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const valueObj = value as Record<string, unknown>
    const processed = processValueObject(valueObj, scope, config, directives)
    inlineAttrs = processed.inlineAttrs
    textContent = processed.textContent

    // Map inline events to props
    for (const [ev, fn] of Object.entries(processed.inlineEvents)) {
      inlineEventProps[toEventProp(ev)] = fn
    }

    // Handle late v-for detection in value object.
    if (directives.vFor !== undefined) {
      // Wrap clean fragment while preserving other directives.
      const cleaned = stripForDirective(valueObj, config.dirFor)
      return compileVFor(
        directives.vFor,
        { [key]: cleaned },
        scope,
        config,
        compileNode,
      )
    }
  }

  // Render raw if v-pre
  if (directives.vPre === true && typeof value === 'string') {
    return [compileVPre(value)]
  }

  // Merge props and resolve tag for component mapping
  const resolvedTag = resolveTag(tag, scope)
  const directiveProps = buildDirectiveProps(directives, scope, resolvedTag)
  const props: Record<string, unknown> = {
    ...attrs,
    ...inlineAttrs,
    ...eventProps,
    ...inlineEventProps,
    ...directiveProps,
  }

  // Process slot directive metadata
  if (directives.vSlot !== undefined) {
    const slotDef = compileVSlot(directives.vSlot.name, scope, directives.vSlot.expr)
    props['data-eider-slot'] = slotDef.name
    if (directives.vSlot.expr) props['data-eider-slot-expr'] = directives.vSlot.expr
  }

  // Compile children elements
  let children: Array<VNode | string> | string | undefined

  if (directives.vHtml !== undefined) {
    props['innerHTML'] = compileVHtml(directives.vHtml, scope)
  } else if (directives.vText !== undefined) {
    children = compileVText(directives.vText, scope)
  } else {
    children = buildChildren(value, scope, config, textContent)
  }

  // Generate finalize VNode
  let vnode = createVNode(tag, scope, props, children)
  vnode = applyPostDirectives(vnode, directives, value, scope, config)

  return [vnode]
}

/** Converts a YAML template node to a VNode tree */
export function compileNode(
  node: unknown,
  scope: Scope,
  config: TemplateCompilerConfig = {
    dirIf: 'v-if',
    dirFor: 'v-for',
    dirModel: 'v-model',
    defaultHtmlTag: 'div',
    fragmentHtmlTag: FragmentTag,
    directiveRe: Regex.DIRECTIVE,
  },
): VNode | string | null {
  // Return primitives directly
  if (typeof node === 'string') return interpolate(node, scope)
  if (typeof node !== 'object' || node === null) return String(node)

  // Map arrays to Fragments
  if (Array.isArray(node)) {
    const vnodes = node
      .map((n) => compileNode(n, scope, config))
      .filter((n): n is VNode | string => n !== null)
    if (vnodes.length === 0) return null
    if (vnodes.length === 1 && typeof vnodes[0] !== 'string') return vnodes[0] as VNode
    return h((config.fragmentHtmlTag || FragmentTag) as Component, {}, vnodes) as VNode
  }

  // Map objects to grouped entries
  const entries = Object.entries(node as Record<string, unknown>)
  if (entries.length === 0) return null

  const grouped = groupEntries(entries, scope, config)
  const vnodes: Array<VNode | string> = []

  for (const entry of grouped) {
    if (entry.kind === 'ifChain') {
      const result = compileVIfChain(entry.branches, scope, config, compileNode)
      if (result !== null) vnodes.push(result)
    } else {
      vnodes.push(...compileSingleEntry(entry.key, entry.value, scope, config))
    }
  }

  if (vnodes.length === 0) return null
  if (vnodes.length === 1) return vnodes[0] as VNode | string
  return h(config.fragmentHtmlTag as Component, {}, vnodes)
}