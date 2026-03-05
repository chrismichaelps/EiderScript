---
shard_id: "@root/hashes/src/runtime/app.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/pinia.hash.md"
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0xB"
---

# EiderScript Runtime — app.runtime.ts

## Purpose
Orchestrates the full EiderApp lifecycle: parse YAML → compile → mount Vue app with Pinia + Router.

## Rules

### R-APP-001: createEiderApp Signature
```ts
createEiderApp(yaml: string, options?: { ssr?: boolean }): Effect<App, ParseError | CompileError>
```

### R-APP-002: Pipeline
```
parseYaml(yaml)
  → compileComponent | compileStore | compileRouter
  → createApp(RootComponent)
  → app.use(createPinia())
  → app.use(router)
  → evaluate global.plugins and execute app.use(input.plugins[name])
  → store registration
  → return app
```

### R-APP-003: SSR Mode
When `options.ssr = true`: `createSSRApp()` is used instead of `createApp()`

### R-APP-004: Multi-YAML Support
`AppAST` may reference external component/store YAML files.
Each referenced file is parsed independently and compiled in sequence.

### R-APP-005: Effect Pipeline
The entire pipeline runs inside a single `Effect.gen` — all errors are typed and propagated.
The consumer calls `Effect.runPromise(createEiderApp(yaml))` to get the app.

### R-APP-006: LiveServices Provision
The app runtime always provides `LiveServices` to all compiler effects.
`Effect.provide(compileEffect, LiveServices)` wraps each compile step.
