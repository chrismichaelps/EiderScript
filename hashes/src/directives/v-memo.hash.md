---
shard_id: "@root/hashes/src/directives/v-memo.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x7"
---

# EiderScript Directives — v-memo.ts

## Purpose
Skips re-rendering if dependency values remain unchanged. Used for performance optimization in lists.

## Rules

### R-VMEMO-001: Signature
```ts
compileVMemo(
  depsExpr: string,
  node: unknown,
  scope: EiderScope,
  config: TemplateCompilerConfig,
  memoKey?: string,
): VNode | null
```

### R-VMEMO-002: Behavior
- Evaluates dependency expression to get memoization values
- Compares with previous render values
- Returns cached VNode if deps unchanged, otherwise compiles new VNode

### R-VMEMO-003: Usage
- `v-memo="[dep1, dep2]"` - array of dependencies
- Vue caches the node when deps match previous render

### R-VMEMO-004: Governance
- Export_Law: named export `compileVMemo`
- Prohibited: no mutation of scope state
