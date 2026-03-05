---
State_ID: BigInt(0xB)
Grammar_Lock: "@root/hashes/grammar/typescript.hash.md"
File: "@root/src/schema/router.schema.ts"
---
## @Schema.Router
### [Signatures]
- `RouteSchema: ZodObject<{ path: ZodString; component: ZodString; children?: ZodArray<RouteSchema> }>`
- `RouterSchema: ZodObject<{ routes: ZodArray<RouteSchema> }>`
- `GlobalSchema: ZodObject<{ plugins?: ZodArray<ZodString> }>`
- `AppSchema: ZodObject<{ name: ZodString; global?: GlobalSchema; router?: RouterSchema; template: ZodUnknown }>`
### [Governance]
- Export_Law: named exports; AppSchema is the top-level union discriminator
- Transformation_Law: Zod → AppAST
- Propagation_Law: ZodError → ParseError by parser layer
