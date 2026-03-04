---
shard_id: "@root/hashes/src/directives/v-pre.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x6"
---

# EiderScript Directives — v-pre.ts

## Purpose
Skips compilation for element and all its children. Displays raw mustache tags without evaluation.

## Rules

### R-VPRE-001: Signature
```ts
compileVPre(content: string): VNode
```

### R-VPRE-002: Behavior
- Uses Vue's `createStaticVNode` for static content
- Content is rendered as-is without interpolation
- Useful for displaying code samples or template syntax

### R-VPRE-003: Governance
- Export_Law: named export `compileVPre`
- Prohibited: no expression evaluation
