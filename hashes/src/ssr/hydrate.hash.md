---
State_ID: "BigInt:0x6"
Git_SHA: HEAD
Grammar_Lock: "@root/hashes/grammar/vue.hash.md"
Parent_Bridge: "@root/hashes/local.map.json"
Shard_ID: "@root/src/ssr/hydrate"
---

## @EiderScript.SSR.Hydrate

### [Signatures]

| Export | Kind | Signature |
|--------|------|-----------|
| `hydrateEider` | fn | `(input: Omit<EiderAppInput, 'ssr'>, selector: string) => Effect.Effect<void, RuntimeError>` |

### [Governance]

**Export Law:** `hydrateEider` is the sole public export. No Vue instance leaks.

**Transformation Law:** `hydrateEider` calls `createEiderApp({ ...input, ssr: false })` — Vue's client-side hydration kicks in automatically when the DOM contains server-rendered HTML.

**Propagation Law:** `app.mount()` errors are caught via `Effect.try` and wrapped into `RuntimeError`.

### [Pipeline]

```
hydrateEider(input, selector)
  → createEiderApp({ ...input, ssr: false })   ← Effect.Effect<EiderApp, RuntimeError>
  → app.mount(selector)                         ← void (hydration)
```

### [Hydration Contract]

- The DOM identified by `selector` MUST already contain SSR-rendered HTML from `renderEider`
- `ssr: false` passes `createApp` (not `createSSRApp`) — Vue detects existing server HTML and hydrates in place
- If the DOM is empty, Vue falls back to a fresh client-side mount (graceful degradation)

### [Prohibited Patterns]

- `PROHIBITED:` Calling `app.mount()` outside of `Effect.try` — uncaught DOM errors would be untracked
- `PROHIBITED:` Passing `ssr: true` — client hydration must use `createApp`, not `createSSRApp`
- `PROHIBITED:` DOM querying or `document.querySelector` inside this module — selector is passed by caller

### [Linkage]

- Depends on: `@root/src/runtime/app.runtime.ts`, `@root/hashes/grammar/vue.hash.md`
- Test Coverage: `@root/src/__tests__/ssr.test.ts`
