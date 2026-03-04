---
State_ID: "BigInt:0x5"
Git_SHA: HEAD
Grammar_Lock: "@root/hashes/grammar/typescript.hash.md"
Parent_Bridge: "@root/hashes/local.map.json"
Shard_ID: "@root/src/runtime/filters"
---

## @EiderScript.Runtime.Filters

### [Signatures]

| Export | Kind | Signature |
|--------|------|-----------|
| `FilterFn` | type | `(value: unknown, ...args: string[]) => unknown` |
| `applyFilters` | fn | `(value: unknown, pipes: string[]) => unknown` |
| `splitPipeExpr` | fn | `(raw: string) => { expr: string; pipes: string[] }` |
| `getFilters` | fn | `() => Readonly<Record<string, FilterFn>>` |
| `FILTERS` | const | `Record<string, FilterFn>` — internal registry, 13 entries |

### [Built-in Filter Registry]

| Filter | Args | Input Contract | Output |
|--------|------|---------------|--------|
| `capitalize` | — | `unknown` → stringified | First char uppercased |
| `upper` | — | `unknown` → stringified | All caps |
| `lower` | — | `unknown` → stringified | All lowercase |
| `trim` | — | `unknown` → stringified | Whitespace stripped |
| `truncate` | `len: string = '80'` | `unknown` → stringified | Sliced with `…` suffix |
| `currency` | `code: string = 'USD'` | `unknown` → `Number()` | `Intl.NumberFormat` currency string |
| `number` | `decimals: string = '0'` | `unknown` → `Number()` | `toFixed(N)` string |
| `join` | `sep: string = ', '` | `Array` or stringified | Joined string |
| `reverse` | — | `Array` | New reversed array (non-mutating) |
| `first` | — | `Array` or passthrough | `arr[0]` |
| `last` | — | `Array` or passthrough | `arr[arr.length - 1]` |
| `json` | — | `unknown` | `JSON.stringify(v, null, 2)` |
| `default` | `fallback: string = ''` | `null \| undefined \| ''` | `fallback`; else passthrough |

### [Governance]

**Export Law:** `applyFilters`, `splitPipeExpr`, `getFilters`, `FilterFn` are public. `FILTERS`, `parsePipeSegment` are module-private.

**Transformation Law:** `splitPipeExpr` detects `|` separators only — never splits on `||` (boolean OR). `parsePipeSegment` parses `name:arg1:arg2` colon syntax; preserves internal whitespace in args (enables `join:' | '` style separators).

**Propagation Law:** Unknown filter names are silently skipped (graceful degradation). No exceptions thrown. Malformed args coerced via `Number()` or `String()`.

### [Prohibited Patterns]

- `PROHIBITED:` Mutating input arrays in `reverse` — must always spread: `[...v].reverse()`
- `PROHIBITED:` Trimming filter argument strings — whitespace in args is intentional (e.g., `join:' | '`)
- `PROHIBITED:` Throwing inside any filter function — all errors must degrade gracefully
- `PROHIBITED:` Adding regex-based pipe detection — use the character-level scan in `splitPipeExpr`

### [Pipe Parsing Algorithm]

`splitPipeExpr` character-level scan:
1. Iterate `raw` char-by-char
2. If `ch === '|'` AND `raw[i+1] !== '|'` AND `raw[i-1] !== '|'` → pipe boundary
3. Push accumulated token to `parts[]`, reset accumulator
4. Return `{ expr: parts[0], pipes: parts.slice(1) }`

`parsePipeSegment` colon split:
1. Find first `:` index
2. Left of `:` → filter `name` (trimmed)
3. Right of `:` → split on `:`, strip surrounding quotes only — not internal whitespace

### [Linkage]

- Consumed by: `@root/src/compiler/template.compiler.ts` → `interpolate()` function
- Grammar Ref: `@root/hashes/grammar/typescript.hash.md`
- Test Coverage: `@root/src/__tests__/runtime.test.ts` — 140+ filter-specific assertions
