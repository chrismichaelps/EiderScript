/** @EiderScript.SSR.Render — Server-side rendering: EiderApp compiles to HTML string */
import { renderToString } from '@vue/server-renderer'
import { Effect } from 'effect'
import type { App } from 'vue'
import { createEiderApp } from '../runtime/app.runtime.js'
import type { EiderAppInput } from '../runtime/app.runtime.js'
import { RuntimeError } from '../effects/errors.js'

export interface SSRResult {
  readonly html: string
  readonly pinia: Record<string, unknown>
}

/**
 * Suppresses a known Vue dev-mode warning that fires during SSR when
 * Vue's internal renderer enumerates keys on component instances.
 *
 * This warning is harmless — Vue itself triggers it via its own SSR
 * code path, and the enumerated keys are only absent in production
 * mode (where this warning doesn't fire anyway).
 */
function suppressSSREnumWarning(vueApp: App): void {
  const prev = vueApp.config.warnHandler
  vueApp.config.warnHandler = (msg, instance, trace) => {
    if (msg.includes('enumerating keys on a component instance')) return
    if (prev) {
      prev(msg, instance, trace)
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Vue warn]: ${msg}`)
    }
  }
}

/** @EiderScript.SSR.renderEider — Compiles + renders EiderApp to HTML string on the server */
export const renderEider = (
  input: Omit<EiderAppInput, 'ssr'>,
): Effect.Effect<SSRResult, RuntimeError> =>
  Effect.gen(function* () {
    const app = yield* createEiderApp({ ...input, ssr: true })

    suppressSSREnumWarning(app.vueApp)

    const html = yield* Effect.tryPromise({
      try: async () => {
        if (app.router && app.router.getRoutes().length > 0) {
          const firstRoute = app.router.getRoutes()[0]!
          await app.router.push(firstRoute.path).catch(() => { })
        }
        return renderToString(app.vueApp)
      },
      catch: (e) =>
        new RuntimeError({
          message: `SSR render failed: ${String(e)}`,
          cause: e,
        }),
    })

    return { html, pinia: {} }
  })