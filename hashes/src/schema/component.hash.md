---
State_ID: BigInt(0xB)
Grammar_Lock: "@root/hashes/grammar/typescript.hash.md"
File: "@root/src/schema/component.schema.ts"
---
## @Schema.Component
### [Signatures]
- `PropSchema: ZodObject<{ type: ZodString; default: ZodOptional<ZodUnknown> }>`
- `SignalSchema: ZodRecord<ZodUnknown>`
- `ComputedSchema: ZodRecord<ZodString>`
- `MethodSchema: ZodString`
- `ActionSchema: ZodObject<{ async: ZodOptional<ZodBoolean>; body: ZodString }>`
- `WatchEntrySchema: ZodObject<{ handler: ZodString; immediate?: ZodBoolean; deep?: ZodBoolean }>`
- `WatchSchema: ZodRecord<WatchEntrySchema>`
- `LifecycleSchema: ZodString`
- `TemplateSchema: ZodUnknown`
- `StylesSchema: ZodObject<{ scoped?: ZodBoolean; css?: ZodString }>`
- `ComponentSchema: ZodObject<{ name, props?, signals?, computeds?, methods?, actions?, watch?, onMounted?, onUnmounted?, template, styles? }>`
### [Governance]
- Export_Law: re-export all schemas + `ComponentSchema` as named exports; no default
- Transformation_Law: Zod parses raw YAML object → typed ComponentAST
- Propagation_Law: ZodError must be mapped to ParseError by caller (parser layer)
