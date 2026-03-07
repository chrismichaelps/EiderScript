/** @EiderScript.Compiler.Router - AppAST to Vue Router createRouter configuration */
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
  memoryHistory = false,
) {
  if (!ast.router) return null

  const routes = buildRoutes(ast.router.routes, resolveComponent)

  // Inject a catch-all redirect to the first declared route if no root route exists
  // to prevent Vue Router 'No match found' warnings with memory history.
  if (memoryHistory && routes.length > 0) {
    const hasRootPath = routes.some(r => r.path === '/');
    if (!hasRootPath) {
      const firstRealRoute = routes.find(r => r.path && !r.path.toString().includes(':catchAll'));
      if (firstRealRoute) {
        routes.push({
          path: '/:pathMatch(.*)*',
          redirect: firstRealRoute.path
        });
      }
    }
  }

  return createRouter({
    history: ssr || memoryHistory ? createMemoryHistory() : createWebHistory(),
    routes,
  })
}
