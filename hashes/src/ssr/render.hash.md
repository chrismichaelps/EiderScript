---
State_ID: "BigInt:0x6"
Git_SHA: HEAD
Grammar_Lock: "@root/hashes/grammar/vue.hash.md"
Parent_Bridge: "@root/hashes/local.map.json"
Shard_ID: "@root/src/ssr/render"
---

## @EiderScript.SSR.Render

### [Signatures]

| Export | Kind | Signature |
|--------|------|-----------|
| `SSRResult` | interface | `{ readonly html: string; readonly pinia: Record<string, unknown> }` |
| `renderEider` | fn | `(input: Omit<EiderAppInput, 'ssr'>) => Effect.Effect<SSRResult, RuntimeError>` |

### [Governance]

**Export Law:** Only `renderEider` and `SSRResult` are public. No Vue internals leak across the shard boundary.

**Transformation Law:** `renderEider` delegates all compilation to `createEiderApp({ ...input, ssr: true })`. It does not perform any YAML parsing or component compilation directly.

**Propagation Law:** `@vue/server-renderer` errors are caught via `Effect.tryPromise` and wrapped into `RuntimeError`. No raw Promise rejections escape.

### [Pipeline]

```
renderEider(input)
  → createEiderApp({ ...input, ssr: true })   ← Effect.Effect<EiderApp, RuntimeError>
  → renderToString(app.vueApp)                 ← Promise<string>
  → { html, pinia: {} }                        ← SSRResult
```

### [Prohibited Patterns]

- `PROHIBITED:` Calling `renderToString` outside of `Effect.tryPromise` — unhandled rejection risk
- `PROHIBITED:` Returning mutable references in `SSRResult` — all fields must be `readonly`
- `PROHIBITED:` Implementing component compilation logic inside `render.ts` — delegate to `app.runtime`

### [Linkage]

- Depends on: `@root/src/runtime/app.runtime.ts`, `@root/hashes/grammar/vue.hash.md`
- Test Coverage: `@root/src/__tests__/ssr.test.ts`
