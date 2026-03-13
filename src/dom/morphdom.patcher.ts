/** @EiderScript.DOM.MorphdomPatcher - Incremental DOM patching via morphdom */
// morphdom ships a CJS main + ESM module. The TS declaration uses `export default`
// but the CJS entrypoint is a direct function reference.
// We cast to the known function shape to avoid the TS declaration mismatch.
import { Effect } from 'effect'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const morphdom = require('morphdom') as (
  fromNode: Node,
  toNode: Node | string,
  options?: {
    childrenOnly?: boolean
    getNodeKey?: (node: Node) => unknown
    onBeforeNodeAdded?: (node: Node) => false | Node
    onNodeAdded?: (node: Node) => void
    onBeforeElUpdated?: (fromEl: HTMLElement, toEl: HTMLElement) => boolean
    onElUpdated?: (el: HTMLElement) => void
    onBeforeNodeDiscarded?: (node: Node) => boolean
    onNodeDiscarded?: (node: Node) => void
    onBeforeElChildrenUpdated?: (fromEl: HTMLElement, toEl: HTMLElement) => boolean
    skipFromChildren?: (fromEl: HTMLElement) => boolean
    addChild?: (parent: HTMLElement, child: HTMLElement) => void
  },
) => Node

type MorphDomOptions = NonNullable<Parameters<typeof morphdom>[2]>

/** @EiderScript.DOM.MorphdomPatcher - Default morphdom options: skip identical nodes */
const DEFAULT_OPTIONS: MorphDomOptions = {
  childrenOnly: true,
  onBeforeElUpdated(fromEl: HTMLElement, toEl: HTMLElement): boolean {
    return !fromEl.isEqualNode(toEl)
  },
}

/** @EiderScript.DOM.MorphdomPatcher - Imperatively patches the DOM in-place */
export function patchDOM(container: Element, newHtml: string, options?: MorphDomOptions): void {
  if (typeof document === 'undefined') return // SSR guard

  const wrapper = document.createElement('div')
  wrapper.innerHTML = newHtml
  morphdom(container, wrapper, options ?? DEFAULT_OPTIONS)
}

/** @EiderScript.DOM.MorphdomPatcher - Effect wrapper for safe pipeline composition */
export function patchDOMEffect(
  container: Element,
  newHtml: string,
  options?: MorphDomOptions,
): Effect.Effect<void, never> {
  return Effect.sync(() => patchDOM(container, newHtml, options))
}
