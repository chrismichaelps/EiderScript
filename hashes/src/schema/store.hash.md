---
State_ID: BigInt(0x2)
Grammar_Lock: "@root/hashes/grammar/typescript.hash.md"
File: "@root/src/schema/store.schema.ts"
---
## @Schema.Store
### [Signatures]
- `StoreStateSchema: ZodRecord<ZodAny>`
- `StoreGetterSchema: ZodRecord<ZodString>`
- `StoreActionSchema: ZodObject<{ async?: ZodBoolean; body: ZodString }>`
- `StoreWatchEntrySchema: ZodObject<{ handler: ZodString; immediate?: ZodBoolean; deep?: ZodBoolean }>`
- `StoreWatchSchema: ZodRecord<StoreWatchEntrySchema>`
- `StoreSchema: ZodObject<{ id: ZodString; state?, getters?, actions?, watch? }>`
### [Governance]
- Export_Law: named exports only
- Transformation_Law: Zod → StoreAST (inferred type)
- Propagation_Law: ZodError → ParseError by parser layer
