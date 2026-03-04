---
shard_id: "@root/hashes/src/directives/v-show.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript Directives — v-show.ts

## Purpose
Handles `v-show=expr` — toggles CSS `display: none` on a DOM element while keeping it mounted in the VNode tree.

## Rules

### R-VSHOW-001: Signature
```ts
compileVShow(
  condition: string,
  scope: EiderScope,
): { style: { display: string } }
```

### R-VSHOW-002: Display Strategy
- Truthy → `{ style: { display: '' } }` (removes forced display override, uses stylesheet default)
- Falsy → `{ style: { display: 'none' } }`
- Returned as a partial props object, merged into element VNode props

### R-VSHOW-003: Does NOT Remove from DOM
Unlike `v-if`, `v-show` always renders the VNode. Only style differs. The VNode lifecycle (mount/unmount) is NOT triggered.

### R-VSHOW-004: Safe Evaluation
`scope.evaluate(condition)` errors → treated as falsy (display: none). Never throws.

### R-VSHOW-005: Governance
- Export_Law: named export `compileVShow` only
- Prohibited: no `v-if` logic — must not unmount/remount VNodes
