/** @EiderScript.Schema.Store - Zod validation shapes for Pinia store YAML */
import { z } from 'zod'

const StoreActionSchema = z.object({
  async: z.boolean().optional(),
  body: z.string(),
})

const StoreWatchEntrySchema = z.object({
  handler: z.string(),
  immediate: z.boolean().optional(),
  deep: z.boolean().optional(),
})

export const StoreSchema = z.object({
  id: z.string(),
  state: z.record(z.string(), z.unknown()).optional(),
  getters: z.record(z.string(), z.string()).optional(),
  actions: z.record(z.string(), z.union([z.string(), StoreActionSchema])).optional(),
  watch: z.record(z.string(), StoreWatchEntrySchema).optional(),
})

export type StoreAST = z.infer<typeof StoreSchema>
