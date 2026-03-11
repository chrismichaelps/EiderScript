/** @EiderScript.Compiler.Router - Vue Router configuration compiler */
import {
  createRouter,
  createWebHistory,
  createMemoryHistory,
} from 'vue-router'
import type {
  RouteRecordRaw,
  RouteComponent,
  RouterScrollBehavior,
  RouteLocationRaw
} from 'vue-router'
import type { AppAST, RouteAST } from '../schema/router.schema.js'
import { createScope } from '../runtime/scope.js'

/** Converts RouteAST tree into RouteRecordRaw[]. */
function buildRoutes(
  routes: RouteAST[],
  resolveComponent: (name: string) => RouteComponent,
): RouteRecordRaw[] {
  return routes.map((route) => {
    const base: RouteRecordRaw = {
      path: route.path,
      ...(route.name ? { name: route.name } : {}),
      ...(route.meta ? { meta: route.meta } : {}),
      ...(route.alias !== undefined ? { alias: route.alias } : {}),
    } as RouteRecordRaw

    // Map route props
    if (route.props !== undefined) {
      if (typeof route.props === 'string') {
        const expr = route.props
        base.props = (to) => {
          const scope = createScope({}, {}, {}, {}, {
            inject: {
              route: to,
              params: to.params,
              query: to.query
            }
          })
          const result = scope.evaluate(expr)
          return typeof result === 'object' && result !== null ? result : {}
        }
      } else {
        base.props = route.props as Record<string, unknown> | boolean
      }
    }

    // Navigation guards
    if (route.beforeEnter) {
      const guardExpr = route.beforeEnter
      base.beforeEnter = (to, from) => {
        const scope = createScope({}, {}, {}, {}, { inject: { to, from } })
        const result = scope.evaluate(guardExpr)

        if (result === false) return false
        if (typeof result === 'string' || (typeof result === 'object' && result !== null)) {
          return result as RouteLocationRaw
        }
        return true
      }
    }

    if (route.redirect !== undefined) {
      Object.assign(base, { redirect: route.redirect })
      if (!route.component) {
        if (route.children?.length) {
          Object.assign(base, { children: buildRoutes(route.children, resolveComponent) })
        }
        return base
      }
    }

    if (route.component) {
      Object.assign(base, { component: resolveComponent(route.component) })
    }

    if (route.children?.length) {
      Object.assign(base, { children: buildRoutes(route.children, resolveComponent) })
    }

    return base
  })
}

/** Map scroll behavior. */
function buildScrollBehavior(mode?: 'top' | 'preserve'): RouterScrollBehavior | undefined {
  if (mode === 'top') return () => ({ top: 0, behavior: 'smooth' })
  if (mode === 'preserve') return (_to, _from, savedPosition) => savedPosition ?? { top: 0 }
  return undefined
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

  // Root catch-all for memory history.
  if (memoryHistory && routes.length > 0) {
    const hasRootPath = routes.some(r => r.path === '/')
    const hasCatchAll = routes.some(r => r.path.toString().includes(':pathMatch'))

    if (!hasRootPath && !hasCatchAll) {
      const firstRealRoute = routes.find(
        r => r.path && !r.path.toString().includes(':pathMatch'),
      )
      if (firstRealRoute) {
        routes.push({
          path: '/:pathMatch(.*)*',
          redirect: firstRealRoute.path as string,
        })
      }
    }
  }

  const scrollBehavior = buildScrollBehavior(ast.router.scrollBehavior)

  return createRouter({
    history: ssr || memoryHistory ? createMemoryHistory() : createWebHistory(),
    routes,
    ...(scrollBehavior ? { scrollBehavior } : {}),
  })
}
