/** @EiderScript.Effects.Services - Internal service contracts via Effect.Service */
import { Effect, Schedule } from 'effect'
import { FetchError } from './errors.js'
import { Tags, EiderConstValues } from '../config/constants.js'
import { EiderConfig } from '../config/eider.config.js'

/** @EiderScript.Effects.FetchService - Typed HTTP fetch abstraction */
export class FetchService extends Effect.Service<FetchService>()(
  Tags.FETCH_SERVICE,
  {
    succeed: {
      fetch: (
        url: string,
        init?: RequestInit,
      ): Effect.Effect<unknown, FetchError> =>
        Effect.gen(function* () {
          const { fetchTimeout, retryCount } = yield* EiderConfig
          const { errHttpPrefix } = yield* EiderConstValues

          return yield* Effect.tryPromise({
            try: async (signal) => {
              const res = await globalThis.fetch(url, { ...init, signal })
              if (!res.ok) {
                throw new FetchError({
                  url,
                  status: res.status,
                  message: `${errHttpPrefix} ${res.status}: ${res.statusText}`,
                })
              }
              return res.json() as unknown
            },
            catch: (e) =>
              e instanceof FetchError
                ? e
                : new FetchError({ url, status: 0, message: String(e) }),
          }).pipe(
            Effect.timeout(fetchTimeout),
            Effect.retry(Schedule.recurs(retryCount))
          )
        }).pipe(
          Effect.catchAll(e => e instanceof FetchError ? Effect.fail(e) : Effect.fail(new FetchError({ url, status: 0, message: String(e) })))
        )
    },
  },
) { }

/** @EiderScript.Effects.LogService - Structured console logging abstraction */
export class LogService extends Effect.Service<LogService>()(
  Tags.LOG_SERVICE,
  {
    succeed: {
      info: (msg: string): Effect.Effect<void> =>
        Effect.gen(function* () {
          const { logPrefix } = yield* EiderConstValues
          console.info(`${logPrefix} ${msg}`)
        }).pipe(Effect.catchAll(() => Effect.sync(() => console.info(`[EiderScript] ${msg}`)))),
      error: (msg: string, cause?: unknown): Effect.Effect<void> =>
        Effect.gen(function* () {
          const { logPrefix } = yield* EiderConstValues
          console.error(`${logPrefix} ${msg}`, cause ?? '')
        }).pipe(Effect.catchAll(() => Effect.sync(() => console.error(`[EiderScript] ${msg}`, cause ?? '')))),
    },
  },
) { }
