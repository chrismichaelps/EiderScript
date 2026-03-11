---
shard_id: "@root/hashes/src/runtime/scope.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Runtime — scope.ts

## Purpose
Creates the reactive evaluation scope for a component's template and methods.

## Rules

### R-SCOPE-001: createScope Signature
```ts
createScope(
  props: Record<string, unknown>,
  signals: Record<string, unknown>,
  computeds: Record<string, string>,
  methods: Record<string, string>,
  options?: { inject?: Record<string, unknown> }
): EiderScope
```

### R-SCOPE-002: EiderScope Shape
```ts
interface EiderScope {
  signals:   Record<string, Ref<unknown>>
  computeds: Record<string, ComputedRef<unknown>>
  evaluate:  (expr: string) => unknown
}
```

### R-SCOPE-003: Signal Initialization
Each signals entry → `ref(value)`. Values are Vue-reactive.

### R-SCOPE-004: Computed Initialization
Each computeds entry → `computed(() => exprParser.evaluate(expr, proxyScope))`
Evaluation scope merges props + signal values + method values.

### R-SCOPE-005: evaluate() Strictness
`evaluate(expr)` evaluates via `jsFallbackEvaluate` using explicit function signatures (no `Function` type).
Errors are caught internally; returns `undefined` on failure.

### R-SCOPE-006: Scope Proxy
The evaluation scope is a flat proxy: `{ ...props, ...signalValues, ...methodFns }`
Signals are accessed by value (not `.value`) in expr-eval expressions.
