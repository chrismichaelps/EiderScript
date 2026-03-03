---
shard_id: "@root/hashes/src/effects/layers.hash.md"
grammar_refs:
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Effects — layers.ts

## Purpose
Exports the merged `LiveServices` layer that provides all runtime services to the Effect pipeline.

## Rules

### R-LAYER-001: LiveServices
```ts
const LiveServices = Layer.mergeAll(
  FetchService.Default,
  LogService.Default,
)
```
- Single entry point for all app-level services
- Consumed by compilers and runtime via `Effect.provide(LiveServices)`

### R-LAYER-002: Layer Composition Law
Must use `Layer.mergeAll` for independent services (not `Layer.provideMerge`)
`Layer.provideMerge` is for dependent layers where output feeds input.

### R-LAYER-003: No Side Effects at Module Load
`LiveServices` is a pure `Layer` value — no side effects occur until `Effect.runSync/runPromise` is called.
