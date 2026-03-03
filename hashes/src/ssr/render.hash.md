---
shard_id: "@root/hashes/src/ssr/render.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript SSR — render.ts

## Purpose
Server-side renders an EiderApp to an HTML string for hydration.

## Rules

### R-SSR-RENDER-001: renderEider Signature
```ts
renderEider(yaml: string): Effect<{ html: string; state: string }, ParseError | CompileError>
```

### R-SSR-RENDER-002: SSR App Creation
Uses `createEiderApp(yaml, { ssr: true })` to get an SSR-capable Vue app

### R-SSR-RENDER-003: renderToString
`@vue/server-renderer`'s `renderToString(app)` converts the VNode tree to HTML string.

### R-SSR-RENDER-004: State Serialization
Pinia state snapshot is serialized as JSON for hydration script injection:
```html
<script>window.__PINIA_STATE__ = {}</script>
```

### R-SSR-RENDER-005: Effect Pipeline
Entire pipeline inside `Effect.gen`: parse → compile → renderToString → serialize state
