---
shard_id: "@root/hashes/src/effects/services.hash.md"
grammar_refs:
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Effects — services.ts

## Purpose
App-level Effect services using `Effect.Service` API. Each service declares its interface and a static `Default` layer.

## Rules

### R-SVC-001: FetchService
```ts
class FetchService extends Effect.Service<FetchService>()("FetchService", {
  succeed: {
    fetch: (url: string) => Effect<Response, RuntimeError>
  }
})
```
- Wraps native `fetch()` in an Effect
- Auto-generates `FetchService.Default` layer

### R-SVC-002: LogService
```ts
class LogService extends Effect.Service<LogService>()("LogService", {
  succeed: {
    log: (msg: string) => Effect<void, never>
    warn: (msg: string) => Effect<void, never>
    error: (msg: string) => Effect<void, never>
  }
})
```
- Console-backed logging service
- Auto-generates `LogService.Default` layer

### R-SVC-003: Effect.Service Pattern
Use `Effect.Service` with `succeed` for services with no construction-time dependencies.
`Default` layers are automatically generated — no manual `Layer.succeed` needed.
