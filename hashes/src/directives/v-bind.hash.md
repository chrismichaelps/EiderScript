---
shard_id: "@root/hashes/src/directives/v-bind.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript Directives — v-bind.ts

## Purpose
Handles dynamic prop/attribute binding via `:prop=expr` shorthand and `v-bind:prop=expr` full syntax. Evaluates expressions at render time using the component scope.

## Rules

### R-VBIND-001: Signature
```ts
compileVBind(
  propName: string,
  expr: string,
  scope: EiderScope,
): Record<string, unknown>
```

### R-VBIND-002: Evaluation
- `expr` is evaluated via `scope.evaluate(expr)` → resulting value is the prop value
- Returns `{ [propName]: evaluatedValue }`
- Errors during evaluation → prop is set to `undefined` (not thrown)

### R-VBIND-003: Class Binding Special Cases
- `:class` with array value → joined as space-separated class string
- `:class` with object `{ [className]: boolean }` → included classes where value is truthy
- `:class` with string → passed as-is

### R-VBIND-004: Style Binding Special Cases
- `:style` with string → parsed as inline style
- `:style` with object → passed directly as VNode style prop

### R-VBIND-005: Spread Binding
- `v-bind` (no prop name) with object expression → spread all keys as props
```ts
compileVBindSpread(expr: string, scope: EiderScope): Record<string, unknown>
```

### R-VBIND-006: Governance
- Export_Law: named exports `compileVBind` and `compileVBindSpread`
- Prohibited: eval() or Function constructor — use scope.evaluate only
