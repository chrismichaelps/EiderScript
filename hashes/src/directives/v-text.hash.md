---
shard_id: "@root/hashes/src/directives/v-text.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x8"
---

# EiderScript Directives — v-text.ts

## Purpose
Handles text content updates safely by casting expressions to strings via `v-text`.

## Rules

### R-VTEXT-001: Signature
```ts
compileVText(expr: string, scope: Scope): string
```

### R-VTEXT-002: Safety
- Uses a safe parsing function `toTextValue(value: unknown)` to cast any type to string.
- Catches expression evaluation bounds to empty string gracefully.

### R-VTEXT-003: Governance
- Export_Law: named export `compileVText`
- Prohibited: direct DOM API usage
