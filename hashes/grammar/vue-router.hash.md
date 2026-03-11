---
Language: VueRouter
Version: 5.0.x
Fidelity: 100% (Physical Disk Reference + EiderScript Schema)
State_ID: BigInt(0x1)
LSP_Discovery_Root: "@root/node_modules/vue-router/package.json"
Grammar_Lock: "@root/hashes/grammar/vue-router.hash.md"
---

/** [Project].Grammar.VueRouter - EiderScript routing surface over Vue Router 5 */

## [SDK_Discovery_Map]
/** @Ref: @root/node_modules/vue-router/dist/vue-router.d.ts */
/** @Ref: @root/src/schema/router.schema.ts */
/** @Ref: @root/src/compiler/router.compiler.ts */

## [YAML_Route_Shape]
```yaml
# Full route record — all fields optional except `path`
router:
  scrollBehavior: top        # 'top' | 'preserve' | omit
  routes:
    - path: /user/:id        # required; supports :param, :param?, :catchAll(.*)
      component: UserView    # component name (from components:); omit for redirect-only
      name: user-profile     # named route — used by RouterLink :to="{ name }"
      alias: /u/:id          # string or [string, string, ...] — extra paths same view
      redirect: /home        # string path OR { name?, path?, params?, query? }
      props: true            # pass :param segments as component props (bool)
      meta:                  # arbitrary key/value; accessible as route.meta.*
        requiresAuth: true
        title: User Profile
      children:              # nested routes: parent must render <RouterView>
        - path: ''           # empty = index child (default child)
          component: Child
          name: child-index
```

## [SDK_Imports / Namespaces]
```ts
import {
  createRouter, createWebHistory, createMemoryHistory,
  createWebHashHistory,
} from 'vue-router'

import type {
  Router, RouteRecordRaw, RouteComponent,
  RouteLocationNormalized, RouteLocationRaw,
  RouterScrollBehavior, NavigationGuard,
  NavigationGuardNext, RouteParamValue,
} from 'vue-router'

// In components (Composition API)
import { useRouter, useRoute, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
```

## [Core_Primitives]
```ts
// createRouter — main factory
const router = createRouter({
  history: createWebHistory(),   // HTML5 pushState
  // history: createMemoryHistory()  // SSR / playground
  // history: createWebHashHistory() // hash-based (#/)
  routes: RouteRecordRaw[],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition ?? { top: 0, behavior: 'smooth' }
  },
})

// RouteRecordRaw — single route definition
interface RouteRecordRaw {
  path: string
  component?: RouteComponent
  components?: Record<string, RouteComponent>   // named views
  name?: string | symbol
  redirect?: RouteLocationRaw | ((to) => RouteLocationRaw)
  alias?: string | string[]
  meta?: Record<string | symbol, unknown>
  props?: boolean | Record<string, unknown> | ((route) => Record<string, unknown>)
  children?: RouteRecordRaw[]
  beforeEnter?: NavigationGuard | NavigationGuard[]
}

// RouteLocationRaw — navigation target
type RouteLocationRaw =
  | string
  | { path: string; query?: Record<string, string>; hash?: string }
  | { name: string | symbol; params?: Record<string, RouteParamValue>; query?: Record<string, string> }
```

## [Composition_API]
```ts
// useRouter — programmatic navigation
const router = useRouter()
router.push('/home')
router.push({ name: 'user-profile', params: { id: '42' } })
router.replace({ path: '/about' })
router.back()
router.forward()
router.go(-2)

// useRoute — reactive current route
const route = useRoute()
route.path         // '/user/42'
route.name         // 'user-profile' | undefined
route.params       // { id: '42' }
route.query        // { q: 'search' }
route.meta         // { requiresAuth: true }
route.matched      // RouteLocationMatched[]
route.fullPath     // '/user/42?q=search#section'
route.hash         // '#section'
```

## [Template_Components]
```html
<!-- RouterLink — declarative navigation -->
<RouterLink to="/home">Home</RouterLink>
<RouterLink :to="{ name: 'user-profile', params: { id: userId } }">Profile</RouterLink>
<RouterLink :to="{ path: '/search', query: { q: term } }">Search</RouterLink>
<!-- Props: to, replace (bool), activeClass, exactActiveClass -->

<!-- RouterView — renders matched component -->
<RouterView />
<!-- With transition: -->
<RouterView v-slot="{ Component }">
  <Transition name="fade">
    <component :is="Component" />
  </Transition>
</RouterView>
<!-- Named views: <RouterView name="sidebar" /> -->
```

## [EiderScript_YAML_Concepts]

### Route with named params as prop
```yaml
- path: /user/:id
  component: UserProfile
  name: user-profile
  props: true          # :id passed as props.id to UserProfile
```

### Redirect to named route with params
```yaml
- path: /me
  redirect:
    name: user-profile
    params:
      id: me
```

### Redirect to path with query
```yaml
- path: /search
  redirect:
    path: /results
    query:
      q: ''
```

### Alias (multiple paths, same view)
```yaml
- path: /
  component: HomeView
  name: home
  alias:
    - /index
    - /start
```

### Route meta (auth guard, title, roles)
```yaml
- path: /admin
  component: AdminLayout
  meta:
    requiresAuth: true
    roles:
      - admin
      - manager
    title: Admin Panel
```

### Nested routes (parent must contain RouterView)
```yaml
- path: /settings
  component: SettingsLayout
  children:
    - path: ''              # index child → /settings
      component: General
      name: settings-general
    - path: account         # → /settings/account
      component: Account
      name: settings-account
```

### Redirect-only index child
```yaml
- path: /admin
  component: AdminLayout
  children:
    - path: ''
      redirect:
        name: admin-dashboard
    - path: dashboard
      component: AdminDashboard
      name: admin-dashboard
```

### 404 catch-all
```yaml
- path: /:pathMatch(.*)*
  component: NotFound
  name: not-found
```

### Redirect catch-all to home
```yaml
- path: /:pathMatch(.*)*
  redirect:
    name: home
```

### scrollBehavior
```yaml
router:
  scrollBehavior: top       # scroll to top on every navigation
  # scrollBehavior: preserve  # restore saved position or top
  routes: ...
```

## [RouterLink_in_EiderScript_Templates]
```yaml
# RouterLink as static text
RouterLink:
  to: /about
  _: About

# RouterLink with named route (use :to for expression)
RouterLink:
  ':to': "{ name: 'user-profile', params: { id: userId } }"
  _: Profile

# RouterLink with query
RouterLink:
  ':to': "{ path: '/search', query: { q: searchTerm } }"
  _: Search
```

## [RouterView_in_EiderScript_Templates]
```yaml
# Bare outlet
RouterView: {}

# Named outlet
RouterView:
  name: sidebar
```

## [EiderScript_Routing_Constraints]
- `component` names reference inline `components:` or externally passed `EiderAppInput.components`
- Route guards (`beforeEnter`, `beforeEach`, `afterEach`) are outside YAML scope — attach via `vueApp.use(router)` hooks after `createEiderApp`
- `scrollBehavior` is limited to `'top'` | `'preserve'`; custom functions require the JS layer
- `props` only accepts `boolean` in YAML (function/object form requires JS layer)
- `components:` (named views) not yet supported — only single `component:` per route
- History mode: `createWebHistory` (default) or `createMemoryHistory` (`memoryRouter: true` in `EiderAppInput`)

## [Standard_Library_Signatures]
```ts
// Router creation
createRouter(options: RouterOptions): Router
createWebHistory(base?: string): RouterHistory
createMemoryHistory(base?: string): RouterHistory
createWebHashHistory(base?: string): RouterHistory

// Router instance
interface Router {
  push(to: RouteLocationRaw): Promise<NavigationFailure | void>
  replace(to: RouteLocationRaw): Promise<NavigationFailure | void>
  resolve(to: RouteLocationRaw): RouteLocation
  addRoute(route: RouteRecordRaw): () => void
  addRoute(parentName: string, route: RouteRecordRaw): () => void
  removeRoute(name: string | symbol): void
  getRoutes(): RouteRecordNormalized[]
  hasRoute(name: string | symbol): boolean
  go(delta: number): void
  back(): ReturnType<Router['go']>
  forward(): ReturnType<Router['go']>
  beforeEach(guard: NavigationGuard): () => void
  afterEach(guard: NavigationHookAfter): () => void
  onError(handler: (err: Error, to: RouteLocationNormalized, from: RouteLocationNormalized) => void): () => void
  isReady(): Promise<void>
  install(app: App): void
}

// Composition
useRouter(): Router
useRoute(): RouteLocationNormalizedLoaded

// In-component guards
onBeforeRouteLeave(guard: NavigationGuard): void
onBeforeRouteUpdate(guard: NavigationGuard): void

// Navigation guard signature
type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => NavigationGuardReturn | Promise<NavigationGuardReturn>
type NavigationGuardReturn = void | boolean | RouteLocationRaw | Error
```

## [Architectural_Laws]
- **Path_Law**: `path` is always required. Children inherit parent path prefix.
- **Name_Law**: Named routes avoid hardcoded URLs. Always name routes used in `RouterLink :to`.
- **Props_Law**: `props: true` converts `:params` to component props; avoids coupling to `useRoute()` inside views.
- **Redirect_Law**: Redirect-only routes omit `component`. Never render content in a redirect.
- **CatchAll_Law**: Place `/:pathMatch(.*)*` last in the routes array.
- **Index_Child_Law**: Empty `path: ''` is the index child (matches parent path exactly).
- **Meta_Law**: Use `meta:` for app-level concerns (auth, title, layout). Read via `route.meta.*`.
- **Nesting_Law**: Parent components must render `<RouterView>` for children to mount.

## [Prohibited_Patterns]
- NO `path: '*'` — use `/:pathMatch(.*)*` (Vue Router 4+/5+)
- NO catch-all before real routes — ordering matters
- NO `component:` on a pure redirect route — wasteful
- NO hardcoded `route.params.id` in components when `props: true` can be used instead
