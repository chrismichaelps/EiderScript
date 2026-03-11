/** @EiderScript.Schema.Router - Router and app YAML schemas */
import { z } from 'zod'
import { ComponentSchema } from './component.schema.js'

// Redirect target.
const RedirectSchema = z.union([
  z.string(),
  z.object({
    name: z.string().optional(),
    path: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    query: z.record(z.string(), z.string()).optional(),
  }),
])

interface Route {
  path: string
  component?: string
  name?: string
  redirect?: z.infer<typeof RedirectSchema>
  alias?: string | string[]
  meta?: Record<string, unknown>
  props?: boolean | Record<string, unknown> | string
  beforeEnter?: string
  children?: Route[]
}

const RouteSchema: z.ZodType<Route> = z.lazy(
  () =>
    z.object({
      path: z.string(),
      component: z.string().optional(),
      name: z.string().optional(),
      redirect: RedirectSchema.optional(),
      alias: z.union([z.string(), z.array(z.string())]).optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
      props: z.union([z.boolean(), z.record(z.string(), z.unknown()), z.string()]).optional(),
      beforeEnter: z.string().optional(),
      children: z.array(RouteSchema).optional().default([]),
    }) as z.ZodType<Route>,
)

function normalizeComponents(val: unknown): unknown {
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
    return Object.entries(val).map(([name, def]) => {
      if (typeof def === 'object' && def !== null) {
        return { ...def, name }
      }
      return def
    })
  }
  return val
}

export const AppSchema = z.object({
  name: z.string(),
  global: z.object({ plugins: z.array(z.string()).optional() }).optional(),
  router: z
    .object({
      routes: z.array(RouteSchema),
      scrollBehavior: z.enum(['top', 'preserve']).optional(),
    })
    .optional(),
  template: z.unknown().optional(),
  components: z
    .preprocess(
      normalizeComponents,
      z.array(ComponentSchema('Component name must not be empty')),
    )
    .optional(),
})

export type RouteAST = Route
export type AppAST = z.infer<typeof AppSchema>
