/** @EiderScript.Schema.Shared - Shared Zod schemas and utilities */
import { z } from 'zod'

export const WatchEntrySchema = z.preprocess(
  (val) => (typeof val === 'string' ? { handler: val } : val),
  z.object({
    handler: z.string(),
    immediate: z.boolean().optional(),
    deep: z.boolean().optional(),
  }),
)

export type WatchEntry = z.infer<typeof WatchEntrySchema>
