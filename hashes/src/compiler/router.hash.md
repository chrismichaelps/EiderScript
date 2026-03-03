---
shard_id: "@root/hashes/src/compiler/router.hash.md"
grammar_refs:
  - "@root/hashes/grammar/vue.hash.md"
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Compiler — router.compiler.ts

## Purpose
Transforms `AppAST.router.routes` into Vue Router `RouteRecordRaw[]`.

## Rules

### R-ROUTER-001: Signature
```ts
compileRouter(ast: AppAST): Effect<Router, CompileError>
```

### R-ROUTER-002: Route Mapping
Each route entry:
```yaml
- path: /about
  component: About
  children:
    - path: team
      component: Team
```
→ `{ path: '/about', component: resolveComponent('About'), children: [...] }`

### R-ROUTER-003: resolveComponent
`component` string → `resolveComponent(name)` call (Vue global component resolution)
Typed as `RouteComponent` (not `string`)

### R-ROUTER-004: Nested Routes
Children are recursively compiled — unlimited nesting depth.
Children array omitted when empty to avoid RouteRecordRaw type union conflicts.

### R-ROUTER-005: createRouter Output
Returns `createRouter({ history: createWebHistory(), routes })`
