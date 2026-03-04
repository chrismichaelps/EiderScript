---
shard_id: "@root/hashes/src/directives/v-on.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x8"
---

# EiderScript Directives — v-on.ts

## Purpose
Provides DOM event bindings (`@click`, `v-on:submit`) with dynamic event names, object mapping capabilities natively matching Vue event modifiers (`.stop`, `.prevent`, `.self`, `.capture`, `.once`, `.passive`).

## Rules

### R-VON-001: Signature
```ts
compileVOn(eventName: string, expr: string, scope: Scope): Record<string, unknown>
```

### R-VON-002: Dynamic Parsing
- Identifies object signatures `v-on="{ blur: handle }"`.
- Parses expressions and dynamically wraps callbacks ensuring `.self`/`.stop` capture.

### R-VON-003: Governance
- Export_Law: named export `compileVOn`
