/** @EiderScript.SSR.Hydrate — Client-side hydration for SSR-rendered EiderApps */
import { Effect } from 'effect'
import { createEiderApp } from '../runtime/app.runtime.js'
import type { EiderAppInput } from '../runtime/app.runtime.js'
import { RuntimeError } from '../effects/errors.js'

/** @EiderScript.SSR.hydrateEider — Hydrates server-rendered HTML on the client */
export const hydrateEider = (
  input: Omit<EiderAppInput, 'ssr'>,
  selector: string,
): Effect.Effect<void, RuntimeError> =>
  Effect.gen(function* () {
    const app = yield* createEiderApp({ ...input, ssr: false })
    yield* Effect.try({
      try: () => app.mount(selector),
      catch: (e) =>
        new RuntimeError({
          message: `Hydration failed: ${String(e)}`,
          cause: e,
        }),
    })
  })