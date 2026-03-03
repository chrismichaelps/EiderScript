/**
 * @EiderScript - Public API barrel
 * Import from 'eiderscript' to access the full runtime API.
 */

// Runtime
export { createEiderApp } from './runtime/app.runtime.js'
export type { EiderAppInput, EiderApp } from './runtime/app.runtime.js'

// SSR
export { renderEider } from './ssr/render.js'
export { hydrateEider } from './ssr/hydrate.js'
export type { SSRResult } from './ssr/render.js'

// Vite plugin
export { eiderPlugin } from './vite-plugin/index.js'

// Errors (for consumer error matching)
export { ParseError, CompileError, RuntimeError, FetchError } from './effects/errors.js'

// Parser (advanced usage)
export { parseYaml } from './parser/yaml.parser.js'
export type { EiderAST } from './parser/types.js'
