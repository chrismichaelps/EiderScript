/** @EiderScript.Parser.Types - AST type aliases derived from Zod schemas */
export type { ComponentAST } from '../schema/component.schema.js'
export type { StoreAST } from '../schema/store.schema.js'
export type { AppAST, RouteAST } from '../schema/router.schema.js'

/** @EiderScript.Parser.Types - Union of all top-level YAML document types */
export type EiderAST =
  | { kind: 'component'; ast: import('../schema/component.schema.js').ComponentAST }
  | { kind: 'store'; ast: import('../schema/store.schema.js').StoreAST }
  | { kind: 'app'; ast: import('../schema/router.schema.js').AppAST }
