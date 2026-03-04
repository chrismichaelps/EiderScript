---
shard_id: "@root/hashes/src/dom/morphdom.patcher.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript DOM — morphdom.patcher.ts

## Purpose
Wraps `morphdom` for incremental DOM patching after signal updates. Replaces the naive full-remount strategy with fine-grained DOM diffing for performance.

## Rules

### R-MORPHDOM-001: Signature
```ts
patchDOM(container: Element, newHtml: string, options?: MorphdomOptions): void
```

### R-MORPHDOM-002: Patch Strategy
- Calls `morphdom(container, newHtml, options)` where `newHtml` is the new rendered HTML string
- Uses `{ childrenOnly: true }` by default to preserve the root container element

### R-MORPHDOM-003: onBeforeElUpdated Hook
Default morphdom options include:
```ts
onBeforeElUpdated(fromEl, toEl) {
  if (fromEl.isEqualNode(toEl)) return false  // skip identical nodes
  return true
}
```

### R-MORPHDOM-004: SSR Guard
Only operates in browser context. SSR calls are no-ops:
```ts
if (typeof document === 'undefined') return
```

### R-MORPHDOM-005: Effect Integration
```ts
patchDOMEffect(container: Element, newHtml: string): Effect.Effect<void, never>
```
Wraps `patchDOM` in `Effect.sync` for safe composition in Effect pipelines.

### R-MORPHDOM-006: Governance
- Export_Law: named exports `patchDOM` and `patchDOMEffect`
- Prohibited: direct `innerHTML` reassignment — always use morphdom
- Dependency: `morphdom` npm package (already in dependencies)
