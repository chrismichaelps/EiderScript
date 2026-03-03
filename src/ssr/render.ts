/** @EiderScript.SSR.Render - Server-side rendering: EiderApp → HTML string */
import { renderToString } from '@vue/server-renderer'
import { Effect } from 'effect'
import { createEiderApp } from '../runtime/app.runtime.js'
import type { EiderAppInput } from '../runtime/app.runtime.js'
import { RuntimeError } from '../effects/errors.js'

export interface SSRResult {
  readonly html: string
  readonly pinia: Record<string, unknown>
}

/** @EiderScript.SSR.renderEider - Compiles + renders EiderApp to HTML string on the server */
export const renderEider = (
  input: Omit<EiderAppInput, 'ssr'>,
): Effect.Effect<SSRResult, RuntimeError> =>
  Effect.gen(function* () {
    const app = yield* createEiderApp({ ...input, ssr: true })

    const html = yield* Effect.tryPromise({
      try: () => renderToString(app.vueApp),
      catch: (e) =>
        new RuntimeError({ message: `SSR render failed: ${String(e)}`, cause: e }),
    })

    return { html, pinia: {} }
  })
