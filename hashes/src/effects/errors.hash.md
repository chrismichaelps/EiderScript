---
shard_id: "@root/hashes/src/effects/errors.hash.md"
grammar_refs:
  - "@root/hashes/grammar/effect.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Effects — errors.ts

## Purpose
Tagged error types for the EiderScript Effect pipeline. All errors extend `Data.TaggedError` for type-safe error handling in Effect chains.

## Rules

### R-ERR-001: ParseError
```ts
class ParseError extends Data.TaggedError("ParseError")<{
  message: string
  source?: string
}>
```
- Emitted by `yaml.parser.ts` on YAML syntax failure or schema validation failure
- `source` carries the raw YAML string for diagnostics

### R-ERR-002: CompileError
```ts
class CompileError extends Data.TaggedError("CompileError")<{
  message: string
  node?: string
}>
```
- Emitted by compiler modules when AST→Vue transformation fails
- `node` carries the AST node identifier

### R-ERR-003: RuntimeError
```ts
class RuntimeError extends Data.TaggedError("RuntimeError")<{
  message: string
  cause?: unknown
}>
```
- Emitted by `app.runtime.ts` on mount/SSR failures

### R-ERR-004: TaggedError Pattern
All errors must use `Data.TaggedError("Tag")<Payload>` — never plain `Error`
Effect channels: `Effect<A, ParseError | CompileError | RuntimeError, R>`
