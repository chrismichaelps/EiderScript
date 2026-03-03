/** @EiderScript.Config.EffectConfig - Dynamic runtime configuration via Effect.Config */
import { Config, ConfigProvider, Effect, Layer } from 'effect'

export const EiderConfig = Config.all({
  // Global timeouts for FetchService and async actions
  fetchTimeout: Config.duration("EIDER_FETCH_TIMEOUT").pipe(Config.withDefault("10 seconds")),
  actionTimeout: Config.duration("EIDER_ACTION_TIMEOUT").pipe(Config.withDefault("5 seconds")),

  // Retry limits for external calls
  retryCount: Config.integer("EIDER_RETRY_COUNT").pipe(Config.withDefault(3)),

  // Feature flags
  enableSSR: Config.boolean("EIDER_ENABLE_SSR").pipe(Config.withDefault(false)),
  enableMorphdom: Config.boolean("EIDER_ENABLE_MORPHDOM").pipe(Config.withDefault(true)),
})

// Default provider allows evaluating config without env vars mapping
const DefaultConfigProvider = ConfigProvider.fromEnv()

export const LiveConfig = Layer.setConfigProvider(DefaultConfigProvider)
