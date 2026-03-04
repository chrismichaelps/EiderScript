---
shard_id: "@root/hashes/src/directives/v-once.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x5"
---

# EiderScript Directives — v-once.ts

## Purpose
Renders element once, never re-renders on subsequent updates. Used for static content optimization.

## Rules

### R-VONCE-001: Signature
```ts
compileVOnce(
  node: unknown,
  scope: EiderScope,
  config: TemplateCompilerConfig,
): VNode | null
```

### R-VONCE-002: Behavior
- Marks VNode with `v-once: true` attribute
- Content is compiled once and cached by Vue
- Subsequent updates skip re-rendering this node

### R-VONCE-003: Governance
- Export_Law: named export `compileVOnce`
- Prohibited: no side effects — pure VNode transformation
