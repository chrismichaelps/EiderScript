---
State_ID: BigInt(0xB)
Grammar_Lock: "@root/hashes/grammar/typescript.hash.md"
File: "@root/src/schema/store.schema.ts"
---
## @Schema.Store
### [Signatures]
- `StoreStateSchema: ZodRecord<ZodUnknown>`
- `StoreGetterSchema: ZodRecord<ZodString>`
- `StoreActionSchema: ZodUnion<[ZodString, ZodObject<{ async?: ZodBoolean; body: ZodString }>]>`
- `StoreWatchEntrySchema: ZodObject<{ handler: ZodString; immediate?: ZodBoolean; deep?: ZodBoolean }>`
- `StoreWatchSchema: ZodRecord<StoreWatchEntrySchema>`
- `StorePluginSchema: ZodUnion<[ZodString, ZodObject<{ name: ZodString; options?: ZodRecord }>]>`
- `StorePersistSchema: ZodUnion<[ZodBoolean, ZodObject<{ key?, storage?, paths?, omit? }>]>`
- `StoreSchema: ZodObject<{ id: ZodString; state?, getters?, actions?, watch?, plugins?, persist? }>`
### [Governance]
- Export_Law: named exports only
- Transformation_Law: Zod → StoreAST (inferred type)
- Propagation_Law: ZodError → ParseError by parser layer
