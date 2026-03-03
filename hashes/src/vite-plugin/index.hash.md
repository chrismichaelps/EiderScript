---
shard_id: "@root/hashes/src/vite-plugin/index.hash.md"
grammar_refs:
  - "@root/hashes/grammar/typescript.hash.md"
fidelity_level: Active
state_anchor: "BigInt:0x2"
---

# EiderScript Vite Plugin — vite-plugin/index.ts

## Purpose
Vite plugin that transforms `.eider.yaml` files during the build pipeline.

## Rules

### R-VITE-001: Plugin Signature
```ts
eiderPlugin(): Plugin
```
Returns a standard Vite `Plugin` object.

### R-VITE-002: Transform Hook
```ts
transform(code, id) {
  if (!id.endsWith('.eider.yaml')) return null
  // compile YAML → ESM module string
}
```
Only activates on `.eider.yaml` file extensions.

### R-VITE-003: Output Format
The compiled `.eider.yaml` is emitted as an ES module exporting the compiled Vue component:
```ts
export default { name, setup, render }
```

### R-VITE-004: Node.js APIs
Uses `node:fs/promises` — only runs in Vite's Node.js build context.
Requires `"node"` in `tsconfig.base.json` types array.

### R-VITE-005: Error Handling
Compilation errors are re-thrown as Vite `RollupError` objects with source position info.
