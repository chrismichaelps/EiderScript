/** @EiderScript.Parser.YamlParser - Parses raw YAML text into validated AST */
import { Effect } from 'effect'
import { load } from 'js-yaml'
import { ComponentSchema } from '../schema/component.schema.js'
import { StoreSchema } from '../schema/store.schema.js'
import { AppSchema } from '../schema/router.schema.js'
import { ParseError } from '../effects/errors.js'
import type { EiderAST } from './types.js'

/** @EiderScript.Parser.YamlParser - Detects YAML document kind by shape.
 * Priority: component > app > store (most specific first to avoid ambiguity)
 * - component: has "name" with "template" (top-level) or "props" — no "id"
 * - app:       has "name" + ("router" | "global"), no "id"
 * - store:     has "id" at top level (all other fields optional)
 */
function detectKind(raw: unknown): 'component' | 'store' | 'app' | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  // Component: must have "name" and either "template" or "props"; must not have "id"
  if (!('id' in obj) && 'name' in obj) {
    if ('template' in obj || 'props' in obj || 'signals' in obj || 'computeds' in obj || 'methods' in obj || 'actions' in obj || 'watch' in obj || 'onMounted' in obj || 'onUnmounted' in obj || 'onBeforeMount' in obj || 'onUpdated' in obj || 'styles' in obj) {
      return 'component'
    }
  }
  // App: name + router/global but not id
  if ('name' in obj && ('router' in obj || 'global' in obj) && !('id' in obj)) return 'app'
  // Store: id at top level
  if ('id' in obj) return 'store'
  return null
}

/** @EiderScript.Parser.parseYaml - Parses and validates a .eider.yaml string */
export const parseYaml = (
  raw: string,
): Effect.Effect<EiderAST, ParseError> =>
  Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => load(raw),
      catch: (e) =>
        new ParseError({ message: `YAML parse failed: ${String(e)}`, source: raw }),
    })

    const kind = detectKind(parsed)

    if (kind === 'component') {
      const result = ComponentSchema.safeParse(parsed)
      if (!result.success) {
        return yield* Effect.fail(
          new ParseError({
            message: result.error.issues.map((i) => i.message).join('; '),
          }),
        )
      }
      return { kind: 'component', ast: result.data } satisfies EiderAST
    }

    if (kind === 'store') {
      const result = StoreSchema.safeParse(parsed)
      if (!result.success) {
        return yield* Effect.fail(
          new ParseError({
            message: result.error.issues.map((i) => i.message).join('; '),
          }),
        )
      }
      return { kind: 'store', ast: result.data } satisfies EiderAST
    }

    if (kind === 'app') {
      const result = AppSchema.safeParse(parsed)
      if (!result.success) {
        return yield* Effect.fail(
          new ParseError({
            message: result.error.issues.map((i) => i.message).join('; '),
          }),
        )
      }
      return { kind: 'app', ast: result.data } satisfies EiderAST
    }

    return yield* Effect.fail(
      new ParseError({
        message:
          'Cannot determine YAML document type. Must have "name"+"template" (component), "id" (store), or "name"+"router" (app).',
        source: raw,
      }),
    )
  })
