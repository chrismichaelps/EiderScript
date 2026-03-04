---
shard_id: "@root/hashes/src/styles/scoped.injector.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript Styles — scoped.injector.ts

## Purpose
Injects a `<style>` tag into the document `<head>` for a given component's scoped CSS. Ensures style is only injected once per component (idempotent).

## Rules

### R-SCOPED-001: Signature
```ts
injectScopedStyle(componentName: string, css: string, scoped: boolean): void
```

### R-SCOPED-002: Injection Strategy
- Creates a `<style>` element with `data-eider-component="componentName"` attribute
- If scoped: prefixes all CSS rules with a generated unique scope attribute selector `[data-v-{hash}]`
- Appends to `document.head` only if no element with the same `data-eider-component` already exists (idempotent)

### R-SCOPED-003: Scope Hash Generation
```ts
generateScopeId(componentName: string): string
```
- Uses a simple deterministic hash of the component name (e.g., FNV-1a 32-bit)
- Returns lowercase hex string prefixed with `data-v-`
- Example: `Counter` → `data-v-a1b2c3d4`

### R-SCOPED-004: SSR Guard
- Checks `typeof document !== 'undefined'` before any DOM access
- No-op on server (SSR) — style injection is client-only

### R-SCOPED-005: Governance
- Export_Law: named exports `injectScopedStyle` and `generateScopeId`
- Prohibited: `innerHTML` manipulation of existing `<style>` tags — always create new elements
