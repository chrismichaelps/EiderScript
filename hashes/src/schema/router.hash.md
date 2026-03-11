---
State_ID: BigInt(0xB)
Grammar_Lock: "@root/hashes/grammar/typescript.hash.md"
File: "@root/src/schema/router.schema.ts"
---
## @Schema.Router
### [Signatures]
- `RouteSchema: ZodObject<{ path: ZodString; component?: ZodString; name?: ZodString; redirect?: RedirectSchema; alias?: ZodUnion<[ZodString, ZodArray<ZodString>]>; meta?: ZodRecord<ZodString, ZodUnknown>; props?: ZodUnion<[ZodBoolean, ZodRecord<ZodString, ZodUnknown>, ZodString]>; beforeEnter?: ZodString; children?: ZodArray<RouteSchema> }>`
- `RouterSchema: ZodObject<{ routes: ZodArray<RouteSchema>; scrollBehavior?: ZodEnum<['top', 'preserve']> }>`
- `GlobalSchema: ZodObject<{ plugins?: ZodArray<ZodString> }>`
- `AppSchema: ZodObject<{ name: ZodString; global?: GlobalSchema; router?: RouterSchema; template?: ZodUnknown; components?: ZodArray<ComponentAST> }>`
### [Governance]
- Export_Law: named exports; AppSchema is the top-level union discriminator
- Transformation_Law: Zod → AppAST
- Propagation_Law: ZodError → ParseError by parser layer
