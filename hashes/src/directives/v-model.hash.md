---
shard_id: "@root/hashes/src/directives/v-model.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript Directives — v-model.ts

## Purpose
Handles two-way binding between a form input element and a reactive signal via `v-model=signalKey`.

## Rules

### R-VMODEL-001: Signature
```ts
compileVModel(
  signalKey: string,
  scope: EiderScope,
): { value: unknown; onInput: (e: Event) => void }
```

### R-VMODEL-002: Binding Strategy
- `value` prop → reads `scope.signals[signalKey].value`
- `onInput` handler → sets `scope.signals[signalKey].value = (e.target as HTMLInputElement).value`
- Returned props object is spread into the VNode props

### R-VMODEL-003: Type Coercion
- `<input type="number">` → `parseFloat(e.target.value)` before assignment
- `<input type="checkbox">` → `(e.target as HTMLInputElement).checked` boolean
- Default → string value (no coercion)
- Type hint is passed as optional second argument `inputType?: string`

### R-VMODEL-004: Signal Guard
If `signalKey` does not exist in `scope.signals`, the handler is a no-op. No throw.

### R-VMODEL-005: Governance
- Export_Law: named export `compileVModel` only
- Prohibited: no `document.querySelector` — operates at VNode prop generation level only
