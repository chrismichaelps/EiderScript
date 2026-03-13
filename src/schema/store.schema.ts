/** @EiderScript.Schema.Store - Zod validation shapes for Pinia store YAML */
import { z } from 'zod'
import { WatchEntrySchema } from './shared.schema.js'

// Action definition
const StoreActionSchema = z.union([
  z.string(),
  z.object({
    async: z.boolean().optional(),
    body: z.string(),
  }),
])

// Plugin descriptor
const StorePluginSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    options: z.record(z.string(), z.unknown()).optional(),
  }),
])

// Persistence config
const StorePersistSchema = z.union([
  z.boolean(),
  z.object({
    /** localStorage key (defaults to store id). */
    key: z.string().optional(),
    /** Storage backend: 'localStorage' | 'sessionStorage' (default: 'localStorage'). */
    storage: z.enum(['localStorage', 'sessionStorage']).optional(),
    /** Array of top-level state keys to persist (omit = persist all). */
    paths: z.array(z.string()).optional(),
    /** Array of state keys to exclude from persistence. */
    omit: z.array(z.string()).optional(),
  }),
])

// Store Schema
export const StoreSchema = z.object({
  /** ID */
  id: z.string().min(1),

  /** State */
  state: z.record(z.string(), z.unknown()).optional(),

  /** Getters */
  getters: z.record(z.string(), z.string()).optional(),

  /** Actions */
  actions: z.record(z.string(), StoreActionSchema).optional(),

  /** Watchers */
  watch: z.record(z.string(), WatchEntrySchema).optional(),

  /** Plugins */
  plugins: z.array(StorePluginSchema).optional(),

  /** Persistence */
  persist: StorePersistSchema.optional(),
})

export type StoreAST = z.infer<typeof StoreSchema>
