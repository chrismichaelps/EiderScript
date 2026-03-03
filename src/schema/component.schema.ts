/** @EiderScript.Schema.Component - Zod validation shapes for component YAML */
import { z } from 'zod'

export const PropSchema = z.object({
  type: z.string(),
  default: z.any().optional(),
})

export const ActionSchema = z.object({
  async: z.boolean().optional(),
  body: z.string(),
})

export const WatchEntrySchema = z.object({
  handler: z.string(),
  immediate: z.boolean().optional(),
  deep: z.boolean().optional(),
})

export const ComponentSchema = (errComponentNameEmpty: string) => z.object({
  name: z.string().min(1, errComponentNameEmpty),
  props: z.record(z.string(), PropSchema).optional(),
  signals: z.record(z.string(), z.any()).optional(),
  computeds: z.record(z.string(), z.string()).optional(),
  methods: z.record(z.string(), z.string()).optional(),
  actions: z.record(z.string(), ActionSchema).optional(),
  watch: z.record(z.string(), WatchEntrySchema).optional(),
  onMounted: z.string().optional(),
  onUnmounted: z.string().optional(),
  onBeforeMount: z.string().optional(),
  onUpdated: z.string().optional(),
  template: z.any().optional(),
  styles: z
    .object({ scoped: z.boolean().optional(), css: z.string().optional() })
    .optional(),
})

export type ComponentAST = z.infer<ReturnType<typeof ComponentSchema>>
