---
shard_id: "@root/hashes/src/parser/types.hash.md"
grammar_refs:
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Parser — types.ts

## Purpose
Discriminated union type `EiderAST` — the output contract of `yaml.parser.ts`.

## Rules

### R-TYPES-001: EiderAST Discriminated Union
```ts
type EiderAST =
  | { kind: 'component'; ast: ComponentAST }
  | { kind: 'store';     ast: StoreAST     }
  | { kind: 'app';       ast: AppAST       }
```
- `kind` is the discriminant for exhaustive switch statements
- `ast` is the Zod-validated, type-safe AST

### R-TYPES-002: Re-export of Schema Types
`types.ts` re-exports `ComponentAST`, `StoreAST`, `AppAST` from their Zod schemas
All downstream consumers import from `parser/types.ts` — not from schema files directly

### R-TYPES-003: No Runtime Logic
`types.ts` is type-only — no runtime values, no effect logic, no imports of Effect
