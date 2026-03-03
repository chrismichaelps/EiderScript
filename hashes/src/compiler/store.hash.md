---
shard_id: "@root/hashes/src/compiler/store.hash.md"
grammar_refs:
  - "@root/hashes/grammar/pinia.hash.md"
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
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

### R-STORE-005: Sync Action → plain function
`actions[n].async = false` → `const key = () => Effect.runSync(Effect.provide(program, LiveServices))`

### R-STORE-006: Async Action → async function
`actions[n].async = true` → `const key = async () => await Effect.runPromise(...)`

### R-STORE-007: Watch in Stores
`watch[key]` entries → `watch(stateRef, handler, options)` called inside setup

### R-STORE-008: All State is Returned
The setup function returns all refs, computeds, and actions — all reactive in Pinia.
