/** @EiderScript.Schema.Router - Zod validation shapes for router and app YAML */
import { z } from 'zod'
import { ComponentSchema } from './component.schema.js'

interface Route {
  path: string
  component: string
  children?: Route[]
}

const RouteSchema: z.ZodType<Route> = z.lazy(() =>
  z.object({
    path: z.string(),
    component: z.string(),
    children: z.array(RouteSchema).optional().default([]),
  }) as z.ZodType<Route>,
)

export const AppSchema = z.object({
  name: z.string(),
  global: z
    .object({ plugins: z.array(z.string()).optional() })
    .optional(),
  router: z
    .object({ routes: z.array(RouteSchema) })
    .optional(),
  template: z.any().optional(),
  /** Inline component definitions — compiled in-order before router is built */
  components: z.array(ComponentSchema('Component name must not be empty')).optional(),
})

export type RouteAST = Route
export type AppAST = z.infer<typeof AppSchema>
