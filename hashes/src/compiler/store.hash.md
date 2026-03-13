---
shard_id: "@root/hashes/src/compiler/store.hash.md"
grammar_refs:
  - "@root/hashes/grammar/pinia.hash.md"
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0xB"
---

# EiderScript Compiler — store.compiler.ts

## Purpose
Transforms `StoreAST` into a Pinia setup store factory function via Effect.

## Rules

### R-STORE-001: Signature
```ts
compileStore(ast: StoreAST): Effect<StoreDefinition, CompileError>
```

### R-STORE-002: Output
Returns the `useStore` function created by Pinia's `defineStore(id, setup)`.

### R-STORE-003: State → ref()
Each `state` entry → `const key = ref(initialValue)` in the setup function.

### R-STORE-004: Getters → computed()
Each `getters` entry → `const key = computed(() => new Function(body))` using signal scope for JS constraint support (e.g. strict equality).

### R-STORE-005: Actions
Actions are compiled into pure JS fallback expressions (sync) or native async functions using specific type signatures (no `any`). Parameters are extracted via `extractActionParams` with multi-pass regex.

### R-STORE-007: Watch in Stores
`watch[key]` entries → `watch(stateRef, handler, options)` called inside setup

### R-STORE-008: All State is Returned
The setup function returns all refs, computeds, and actions — all reactive in Pinia.
