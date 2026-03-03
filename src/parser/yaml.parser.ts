/** @EiderScript.Parser.YamlParser - Parses raw YAML text into validated AST */
import { Effect } from 'effect'
import { load } from 'js-yaml'
import { ComponentSchema } from '../schema/component.schema.js'
import { StoreSchema } from '../schema/store.schema.js'
import { AppSchema } from '../schema/router.schema.js'
import { ParseError } from '../effects/errors.js'
import { EiderConstValues } from '../config/constants.js'
import type { EiderAST } from './types.js'

interface DocumentKinds {
  component: string
  store: string
  app: string
}

/** @EiderScript.Parser.YamlParser - Detects YAML document kind by shape. */
function detectKind(raw: unknown, kinds: DocumentKinds): string | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  // Component: must have "name" and either "template" or "props"; must not have "id"
  if (!('id' in obj) && 'name' in obj) {
    if ('template' in obj || 'props' in obj || 'signals' in obj || 'computeds' in obj || 'methods' in obj || 'actions' in obj || 'watch' in obj || 'onMounted' in obj || 'onUnmounted' in obj || 'onBeforeMount' in obj || 'onUpdated' in obj || 'styles' in obj) {
      return kinds.component
    }
  }
  if ('name' in obj && ('router' in obj || 'global' in obj) && !('id' in obj)) return kinds.app
  if ('id' in obj) return kinds.store
  return null
}

/** @EiderScript.Parser.parseYaml - Parses and validates a .eider.yaml string */
export const parseYaml = (
  raw: string,
): Effect.Effect<EiderAST, ParseError> =>
  Effect.gen(function* () {
    const eiderConstants = yield* EiderConstValues

    const parsed = yield* Effect.try({
      try: () => load(raw),
      catch: (e) =>
        new ParseError({ message: `${eiderConstants.errParseFailed} ${String(e)}`, source: raw }),
    })

    const kinds = { component: eiderConstants.kindComponent, store: eiderConstants.kindStore, app: eiderConstants.kindApp }
    const kind = detectKind(parsed, kinds)

    if (kind === eiderConstants.kindComponent) {
      const result = ComponentSchema(eiderConstants.errComponentNameEmpty).safeParse(parsed)
      if (!result.success) {
        return yield* Effect.fail(
          new ParseError({
            message: result.error.issues.map((i) => i.message).join('; '),
          }),
        )
      }
      return { kind: 'component', ast: result.data } satisfies EiderAST
    }

    if (kind === eiderConstants.kindStore) {
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

    if (kind === eiderConstants.kindApp) {
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
        message: eiderConstants.errUnknownYaml,
        source: raw,
      }),
    )
  }).pipe(
    Effect.catchAll(e => e instanceof ParseError ? Effect.fail(e) : Effect.fail(new ParseError({ message: String(e), source: raw })))
  )
