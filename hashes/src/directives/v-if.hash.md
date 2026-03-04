---
shard_id: "@root/hashes/src/directives/v-if.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x4"
---

# EiderScript Directives — v-if.ts

## Purpose
Handles conditional rendering via `v-if`, `v-else-if`, and `v-else` directives. Returns the first truthy branch or null.

## Rules

### R-VIF-001: Signature
```ts
compileVIf(
  condition: string,
  node: unknown,
  scope: EiderScope,
  config: TemplateCompilerConfig,
): VNode | null
```

### R-VIF-002: Condition Evaluation
- `condition` string is evaluated via `scope.evaluate(condition)`
- Truthy → compile and return the VNode for this branch
- Falsy → return `null` (Vue renders nothing)

### R-VIF-003: Chain Support (v-else-if / v-else)
The template compiler passes sibling nodes for `v-else-if` and `v-else` evaluation:
```ts
compileVIfChain(
  branches: Array<{ directive: 'v-if'|'v-else-if'|'v-else'; condition?: string; node: unknown }>,
  scope: EiderScope,
  config: TemplateCompilerConfig,
): VNode | null
```
Iterates branches in order, returns first matching branch VNode.

### R-VIF-004: null Safety
- If `scope.evaluate` throws or returns `undefined`, treat as falsy
- `v-else` branch has no condition — always renders if reached

### R-VIF-005: Governance
- Export_Law: named exports `compileVIf` and `compileVIfChain`
- Prohibited: no DOM access — pure VNode computation only
