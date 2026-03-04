---
shard_id: "@root/hashes/src/directives/v-cloak.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x8"
---

# EiderScript Directives — v-cloak.ts

## Purpose
Removes directive after Vue compiles template. Used to hide uncompiled mustache templates during load.

## Rules

### R-VCLOAK-001: Signature
```ts
compileVCloak(
  node: unknown,
  scope: EiderScope,
  config: TemplateCompilerConfig,
): VNode | null
```

### R-VCLOAK-002: Behavior
- Adds `v-cloak` attribute to VNode
- CSS rule `[v-cloak] { display: none }` hides element until Vue finishes compilation
- Vue removes attribute after mounting

### R-VCLOAK-003: Governance
- Export_Law: named export `compileVCloak`
- Prohibited: no expression evaluation - purely structural
