---
shard_id: "@root/hashes/src/compiler/template.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0xB"
---

# EiderScript Compiler — template.compiler.ts

## Purpose
Walks the YAML template tree and produces Vue VNodes via `h()`.

## Rules

### R-TPL-001: compileNode Signature
```ts
compileNode(node: unknown, scope: EiderScope): VNode | string | null
```

### R-TPL-002: String Interpolation
Template strings with `{{ expr }}` → `scope.evaluate(expr)` → interpolated string
Missing variable → empty string (never throws)

### R-TPL-003: Object → h() VNode
```yaml
"button @click=inc .primary": Click me
```
→ `h('button', { class: 'primary', onClick: scope[inc] }, ['Click me'])`

### R-TPL-004: Key DSL Parsing
Tag key grammar:
- `tagName` → HTML element
- `.className` → class attribute (multiple allowed)
- `#id` → id attribute
- `@event=handler` → event listener (`onClick`, `onInput`, etc.)
- `v-if=expr` → conditional render
- `v-for=item in list` → list render
- `v-model=signal` → two-way binding
- `:prop=expr` → dynamic prop binding

### R-TPL-005: Null/Empty Guard
Empty object `{}` → `null`
`undefined` node → `null`
Scalars (number, boolean) → stringified

### R-TPL-006: Vue Built-in Components
Strings matching Vue internals (`teleport`, `suspense`, `keep-alive`, `transition`, `transition-group`) are mapped to the actual imported `vue` Component primitves instead of raw string tags via `builtInTagMap`.
