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
Each `getters` entry → `const key = computed(() => expr-eval(body))` using signal scope.

### R-STORE-005: Actions
Actions are compiled into plain functions (sync) or async functions using specific type signatures (no `any`).
Each action result is wrapped/run via Effect.

### R-STORE-007: Watch in Stores
`watch[key]` entries → `watch(stateRef, handler, options)` called inside setup

### R-STORE-008: All State is Returned
The setup function returns all refs, computeds, and actions — all reactive in Pinia.
