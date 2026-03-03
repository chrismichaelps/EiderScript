/** @EiderScript.Compiler.Router - AppAST → Vue Router createRouter configuration */
import {
  createRouter,
  createWebHistory,
  createMemoryHistory,
} from 'vue-router'
import type { RouteRecordRaw, RouteComponent } from 'vue-router'
import type { AppAST, RouteAST } from '../schema/router.schema.js'

/**
 * @EiderScript.Compiler.Router - Converts RouteAST tree into RouteRecordRaw[].
 * Component names are resolved at runtime via the injected resolveComponent fn.
 */
function buildRoutes(
  routes: RouteAST[],
  resolveComponent: (name: string) => RouteComponent,
): RouteRecordRaw[] {
  return routes.map((route) => ({
    path: route.path,
    component: resolveComponent(route.component),
    ...(route.children?.length
      ? { children: buildRoutes(route.children, resolveComponent) }
      : {}),
  }))
}

/** @EiderScript.Compiler.Router.compileRouter - Creates a Vue Router from AppAST */
export function compileRouter(
  ast: AppAST,
  resolveComponent: (name: string) => RouteComponent,
  ssr = false,
) {
  if (!ast.router) return null

  const routes = buildRoutes(ast.router.routes, resolveComponent)

  return createRouter({
    history: ssr ? createMemoryHistory() : createWebHistory(),
    routes,
  })
}
