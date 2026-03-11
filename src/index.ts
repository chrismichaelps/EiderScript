/**
 * EiderScript - Public API
 */

// App
export { createEiderApp } from './runtime/app.runtime.js'
export type { EiderAppInput, EiderApp } from './runtime/app.runtime.js'

// Scope
export { createScope } from './runtime/scope.js'
export type { Scope } from './runtime/scope.js'

// Template Filters
export { applyFilters, splitPipeExpr, getFilters } from './runtime/filters.js'
export type { FilterFn } from './runtime/filters.js'

// SSR
export { renderEider } from './ssr/render.js'
export { hydrateEider } from './ssr/hydrate.js'
export type { SSRResult } from './ssr/render.js'

// Errors
export { ParseError, CompileError, RuntimeError, FetchError } from './effects/errors.js'

// Parser
export { parseYaml } from './parser/yaml.parser.js'
export type { EiderAST } from './parser/types.js'
