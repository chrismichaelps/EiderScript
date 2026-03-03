/** @EiderScript.Effects.Services - Internal service contracts via Effect.Service */
import { Effect } from 'effect'
import { FetchError } from './errors.js'

/** @EiderScript.Effects.FetchService - Typed HTTP fetch abstraction */
export class FetchService extends Effect.Service<FetchService>()(
  'EiderScript/FetchService',
  {
    succeed: {
      fetch: (
        url: string,
        init?: RequestInit,
      ): Effect.Effect<unknown, FetchError> =>
        Effect.tryPromise({
          try: async () => {
            const res = await globalThis.fetch(url, init)
            if (!res.ok) {
              throw new FetchError({
                url,
                status: res.status,
                message: `HTTP ${res.status}: ${res.statusText}`,
              })
            }
            return res.json() as unknown
          },
          catch: (e) =>
            e instanceof FetchError
              ? e
              : new FetchError({ url, status: 0, message: String(e) }),
        }),
    },
  },
) { }

/** @EiderScript.Effects.LogService - Structured console logging abstraction */
export class LogService extends Effect.Service<LogService>()(
  'EiderScript/LogService',
  {
    succeed: {
      info: (msg: string): Effect.Effect<void> =>
        Effect.sync(() => console.info(`[EiderScript] ${msg}`)),
      error: (msg: string, cause?: unknown): Effect.Effect<void> =>
        Effect.sync(() => console.error(`[EiderScript] ${msg}`, cause ?? '')),
    },
  },
) { }
