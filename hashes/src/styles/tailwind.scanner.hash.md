---
shard_id: "@root/hashes/src/styles/tailwind.scanner.hash.md"
grammar_refs:
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript Styles — tailwind.scanner.ts

## Purpose
Walks a parsed YAML AST (any depth) and collects all Tailwind CSS class strings for use as Vite plugin content scanning output. Enables JIT/AOT class generation without parsing HTML.

## Rules

### R-TWSCAN-001: Signature
```ts
scanTailwindClasses(ast: unknown): string[]
```

### R-TWSCAN-002: Scanning Strategy
Recursively walks all values in the AST object tree:
- String values → tokenized by whitespace, each token checked against Tailwind class patterns
- Object keys → checked for Tailwind patterns (used in template node keys)
- Arrays → each element scanned recursively

### R-TWSCAN-003: Class Pattern Detection
A token is classified as a Tailwind class if it matches:
```ts
/^-?[a-z]([a-z0-9:-])*(\[.+\])?$/.test(token)
```
This covers: `text-red-500`, `hover:bg-blue-600`, `md:flex`, `p-4`, `opacity-[0.5]`, etc.

### R-TWSCAN-004: Deduplication
Returns a deduplicated `string[]` — no duplicate class names.

### R-TWSCAN-005: Pure Function
- No side effects, no state
- Returns same output for same input (deterministic)
- Never throws — errors caught internally, returns empty array on failure

### R-TWSCAN-006: Governance
- Export_Law: named export `scanTailwindClasses` only
- Prohibited: regex with backtracking catastrophe risk (no nested quantifiers on unbounded input)
