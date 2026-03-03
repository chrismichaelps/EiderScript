---
shard_id: "@root/hashes/src/compiler/component.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/effect.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Compiler — component.compiler.ts

## Purpose
Transforms `ComponentAST` into a Vue 3 component options object via Effect.

## Rules

### R-COMP-001: Signature
```ts
compileComponent(ast: ComponentAST): Effect<Component, CompileError>
```

### R-COMP-002: Output Shape
```ts
{
  name: string,
  props: Record<string, PropOptions>,   // Vue prop definitions
  setup(props): Record<string, unknown>, // returns reactive scope exposed to template
  render(): VNode | null                 // compiled template tree
}
```

### R-COMP-003: Signal → Ref
Each `signals` entry → `ref(initialValue)` in setup scope
Signals are mutated via `scope.signals[key].value = newValue`

### R-COMP-004: Computed → computed()
Each `computeds` entry → `computed(() => scope.evaluate(expr))` using `expr-eval`

### R-COMP-005: Methods → plain functions
Each `methods` entry → `() => scope.evaluate(body)` (sync, expr-eval)

### R-COMP-006: Sync Action → plain function
`actions[n].async = false` → `() => Effect.runSync(Effect.provide(program, LiveServices))`

### R-COMP-007: Async Action → async function
`actions[n].async = true` → `async () => await Effect.runPromise(Effect.provide(program, LiveServices))`

### R-COMP-008: Watch → watch() call in setup
`watch[key]` → `watch(signal, handler, { immediate, deep })`

### R-COMP-009: Lifecycle Hooks
`onMounted`, `onUnmounted`, `onBeforeMount`, `onUpdated` → registered via Vue composable in setup

### R-COMP-010: render() guards
`render()` returns `null` when `ast.template` is `undefined` (headless components)
