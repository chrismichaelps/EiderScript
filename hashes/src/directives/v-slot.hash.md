---
shard_id: "@root/hashes/src/directives/v-slot.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x8"
---

# EiderScript Directives — v-slot.ts

## Purpose
Establishes structural slot frameworks matching Vue's `v-slot` providing scope variables to parent slots dynamic configurations.

## Rules

### R-VSLOT-001: Signature
```ts
compileVSlot(slotName: string = 'default', scope?: Scope, propsExpr?: string, fallbackNode?: unknown): SlotContent
```
### R-VSLOT-002: Dynamic Parsing
- Handles parsed slot names properly falling back to 'default'.
- Merges inline expressions into nested scope properties automatically.

### R-VSLOT-003: Governance
- Export_Law: named export `compileVSlot`
