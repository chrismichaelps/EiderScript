---
shard_id: "@root/hashes/src/directives/v-for.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript Directives — v-for.ts

## Purpose
Handles `v-for="item in list"` and `v-for="(item, index) in list"` template directives, producing an array of keyed VNodes from a reactive signal or computed value.

## Rules

### R-VFOR-001: Signature
```ts
compileVFor(
  expr: string,
  children: unknown,
  scope: EiderScope,
  config: TemplateCompilerConfig,
): VNode[]
```

### R-VFOR-002: Expression Parsing
- `"item in list"` → iterates `scope.evaluate('list')`, exposes `item` per iteration
- `"(item, index) in list"` → exposes both `item` and `index` per iteration
- `"(item, key) in obj"` → iterates `Object.entries()` of an object value

### R-VFOR-003: VNode Key Strategy
- If child node has `:key=expr`, evaluate `expr` in iteration scope as the VNode key
- Fallback: use numeric index as key
- Keys passed as `{ key: value }` in VNode props

### R-VFOR-004: Scope Isolation
Each iteration creates a merged scope: `{ ...outerScope, [itemVar]: item, [indexVar]: index }`.
The outer scope signals remain accessible (read-only view).

### R-VFOR-005: Empty List Guard
Empty array or null/undefined list → returns `[]` (no VNodes, no error)

### R-VFOR-006: Governance
- Export_Law: named export `compileVFor` only
- Transformation_Law: returns `VNode[]`, never `null`
- Prohibited: mutation of outer scope from within iteration — scope merges must be pure
