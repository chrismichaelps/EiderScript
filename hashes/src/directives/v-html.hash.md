---
shard_id: "@root/hashes/src/directives/v-html.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x8"
---

# EiderScript Directives — v-html.ts

## Purpose
Handles raw HTML injections safely parsing expressions via `v-html`.

## Rules

### R-VHTML-001: Signature
```ts
compileVHtml(expr: string, scope: Scope): string
```

### R-VHTML-002: Safety
- Evaluates html via `toHtmlValue(value: unknown)`.
- Fails securely on arbitrary nested values to string.

### R-VHTML-003: Governance
- Export_Law: named export `compileVHtml`
