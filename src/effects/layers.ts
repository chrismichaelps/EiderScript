/** @EiderScript.Effects.Layers - Composed LiveServices layer from all internal services */
import { Layer } from 'effect'
import { FetchService, LogService } from './services.js'

/**
 * @EiderScript.Effects.LiveServices - Merged production layer for all internal services.
 * Resolves: FetchService + LogService. Provide to any Effect requiring internal services.
 * Usage: Effect.provide(myEffect, LiveServices)
 */
export const LiveServices = Layer.mergeAll(
  FetchService.Default,
  LogService.Default,
)
