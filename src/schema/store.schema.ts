/** @EiderScript.Schema.Store - Zod validation shapes for Pinia store YAML */
import { z } from 'zod'
import { WatchEntrySchema } from './shared.schema.js'

const StoreActionSchema = z.object({
  async: z.boolean().optional(),
  body: z.string(),
})

export const StoreSchema = z.object({
  id: z.string(),
  state: z.record(z.string(), z.unknown()).optional(),
  getters: z.record(z.string(), z.string()).optional(),
  actions: z
    .record(z.string(), z.union([z.string(), StoreActionSchema]))
    .optional(),
  watch: z.record(z.string(), WatchEntrySchema).optional(),
})

export type StoreAST = z.infer<typeof StoreSchema>
