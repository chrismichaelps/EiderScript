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
compileRouter(ast: AppAST, resolve: (n: string) => RouteComponent, ssr?: boolean, mem?: boolean): Router | null
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
→ `{ path: '/about', component: resolveComponent('About'), name: 'about', meta: {...}, props: true/expr/object, beforeEnter: guardFn }`

### R-ROUTER-003: resolveComponent
`component` string → `resolveComponent(name)` call (Vue global component resolution)
Typed as `RouteComponent` (not `string`)

Children are recursively compiled. Array omitted if empty.
Names moved to first child if parent is purely a container with named redirect.

### R-ROUTER-005: Scroll Behavior
`scrollBehavior` mapping: `top` → `{ top: 0, behavior: 'smooth' }`, `preserve` → `savedPosition`.

### R-ROUTER-006: Catch-All Redirection
In `memoryHistory`, adds `/:pathMatch(.*)*` redirecting to first real route if no root exists.
Prevents duplication if catch-all already defined in AST.

### R-ROUTER-007: Output
Returns `createRouter({ history, routes, scrollBehavior })`
