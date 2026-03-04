---
shard_id: "@root/hashes/src/config/eider.config.hash.md"
grammar_refs:
  - "@root/hashes/grammar/effect.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript Config — eider.config.ts

## Purpose
Declares all runtime-tunable EiderScript configuration values using `Effect.Config`. Allows overriding any constant via environment variables without changing source code.

## Rules

### R-CONFIG-001: Signature
```ts
export const EiderConfig: Config.Config<{
  fetchTimeout: Duration.Duration
  actionTimeout: Duration.Duration
  retryCount: number
  enableSSR: boolean
  enableMorphdom: boolean
}>
```

### R-CONFIG-002: Config.all Shape
All entries are grouped under a single `Config.all({...})` call. No top-level individual exports.

### R-CONFIG-003: Default Values
| Key | Env Var | Default |
|---|---|---|
| `fetchTimeout` | `EIDER_FETCH_TIMEOUT` | `"10 seconds"` |
| `actionTimeout` | `EIDER_ACTION_TIMEOUT` | `"5 seconds"` |
| `retryCount` | `EIDER_RETRY_COUNT` | `3` |
| `enableSSR` | `EIDER_ENABLE_SSR` | `false` |
| `enableMorphdom` | `EIDER_ENABLE_MORPHDOM` | `true` |

### R-CONFIG-004: ConfigProvider
A `defaultProvider` is exported for test usage, using `ConfigProvider.fromMap({})` so all defaults resolve without env vars.

### R-CONFIG-005: Governance
- Export_Law: named exports `EiderConfig` and `defaultProvider` only
- Transformation_Law: `Config.duration` for timeouts, `Config.integer` for counts, `Config.boolean` for flags
- Propagation_Law: `ConfigError` must never surface to the user — `.pipe(Config.withDefault(...))` is mandatory on every entry
