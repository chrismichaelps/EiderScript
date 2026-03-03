---
shard_id: "@root/hashes/src/parser/yaml.hash.md"
grammar_refs:
  - "@root/hashes/grammar/effect.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Parser — yaml.parser.ts

## Purpose
Parses raw `.eider.yaml` text into a validated `EiderAST` via Effect.

## Rules

### R-YAML-001: parseYaml Signature
```ts
parseYaml(raw: string): Effect<EiderAST, ParseError>
```
- Input: raw YAML string
- Output: `EiderAST` (discriminated union: component | store | app)
- Failure: `ParseError` on syntax error or Zod validation failure

### R-YAML-002: detectKind Priority
Detection order (most specific first):
1. `component` — `name` + any of: `template|props|signals|computeds|methods|actions|watch|onMounted|...` (no `id`)
2. `app` — `name` + (`router` | `global`), no `id`
3. `store` — `id` present (state/actions/getters all optional)
4. `null` — returns ParseError

### R-YAML-003: Two-Phase Validation
Phase 1: `js-yaml.load()` — YAML syntax parse (throws → ParseError)
Phase 2: Zod `.safeParse()` — schema validation (failure → ParseError with Zod issues joined)

### R-YAML-004: Effect.try Wrapping
`js-yaml.load()` is wrapped with `Effect.try({ try, catch: e => new ParseError(...) })`
Never call `load()` outside Effect context — it can throw.

### R-YAML-005: Kind Isolation
Each kind is validated against its own schema independently.
There is no shared validation path.
