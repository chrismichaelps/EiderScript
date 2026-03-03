---
shard_id: "@root/hashes/src/ssr/hydrate.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript SSR — hydrate.ts

## Purpose
Client-side hydration — mounts the EiderApp onto server-rendered DOM without full re-render.

## Rules

### R-SSR-HYDRATE-001: hydrateEider Signature
```ts
hydrateEider(yaml: string, container: Element): Effect<void, ParseError | CompileError>
```

### R-SSR-HYDRATE-002: Non-SSR App
Uses `createEiderApp(yaml, { ssr: false })` — standard `createApp()` for hydration context

### R-SSR-HYDRATE-003: mount()
`app.mount(container)` — Vue hydrates the existing server-rendered DOM
Vue's hydration algorithm reconciles the VNode tree with existing DOM nodes.

### R-SSR-HYDRATE-004: Pinia State Rehydration
Reads `window.__PINIA_STATE__` injected by the SSR render step to restore store state.

### R-SSR-HYDRATE-005: Client-Only
This module must only be imported in browser environments — it references `window`.
