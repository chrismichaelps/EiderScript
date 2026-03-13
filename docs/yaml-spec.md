# YAML Manifest Specification

EiderScript utilizes a declarative YAML format to define application state, logic, and UI. Every manifest is structured as a typed document with a specific `kind`.

## **1. Component Manifest (`kind: component`)**
Components are reactive units that encapsulate state, logic, and templates.

| Property | Type | Logic Scope | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | N/A | **Required.** Unique component identifier. |
| `props` | `Record<string, PropDescriptor>` | Read-only | Property contracts: `{ type: 'string'\|'number'\|'boolean'\|'array'\|'object', default?: any }`. |
| `signals` | `Record<string, any>` | Reactive | Local state primitives. Initial values are wrapped in Vue `ref()`. |
| `computeds` | `Record<string, string>` | Reactive | Memoized derivations; keys are EiderScript expressions. |
| `methods` | `Record<string, string \| Action>` | Procedural | Shorthand: `async name: body` or `{ async: true, body: string }`. |
| `actions` | `Record<string, Action>` | Effect | Logic optimized for `Effect.ts`. |
| `watch` | `Record<string, WatchEntry>` | Side-effect | Observes signal changes: `{ handler: string, immediate?: boolean, deep?: boolean }`. |
| `provide` | `Record<string, string\|any>` | Injection | Exposes data to children. |
| `inject` | `string[] \| Record<string, string>` | Injection | Consumes parent data. |
| `emits` | `string[]` | Events | Declares custom events via `emit('event-name', payload)`. |
| `lifecycle` | `string` | Lifecycle | Logic for `onMounted`, `onUnmounted`, `onBeforeMount`, `onUpdated`. |
| `template` | `EiderAST` | Registry | Declarative UI tree. |
| `styles` | `object` | Styling | Component CSS: `{ scoped?: boolean, css: string }`. |

---

## **2. Application Manifest (`kind: app`)**
The root manifest defining navigation and global dependencies.

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | **Required.** Root application namespace. |
| `router.routes` | `Route[]` | **Required.** Array of route mapping descriptors. |
| `router.scrollBehavior` | `string` | Managed scroll strategy (`top` or `preserve`). |
| `global.plugins` | `string[]` | Registry of external Vue plugins. |
| `components` | `Component[]` | Inline component manifests. |
| `template` | `EiderAST` | Optional root layout manifest. |

**Route Descriptor:**
- `path`: **Required.** URL segment pattern.
- `component`: Name of the registered Eider component.
- `redirect`: Navigation target.
- `beforeEnter`: EiderScript expression for navigation guards.
- `children`: Recursive array of nested route manifests.

---

## **3. Store Manifest (`kind: store`)**
Global state managed by **Pinia**. Store manifests compile to Pinia **Setup Stores** at runtime.

> **Detection rule:** The `id` field is the discriminator. Documents with a top-level `id` are parsed as stores.

| Property | Type | Pinia Equivalent | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | `defineStore(id, …)` | **Required.** Unique store identifier. |
| `state` | `Record<string, any>` | `ref(initial)` | Reactive state primitives. Accessed directly by name in getters/actions. |
| `getters` | `Record<string, string>` | `computed(expr)` | Memoized derived values evaluated against the store scope. |
| `actions` | `Record<string, string \| Action>` | store method | Shorthand: single expression string. Full form: `{ async: true, body: string }`. |
| `watch` | `Record<string, WatchEntry>` | `watch(ref, …)` | Side-effect watchers on state keys. Shorthand: handler expression string. |
| `plugins` | `string[] \| PluginDescriptor[]` | `pinia.use(…)` | Pinia plugins to activate. Must be registered in the root app. |
| `persist` | `boolean \| PersistConfig` | persistedstate | State persistence (requires `pinia-plugin-persistedstate`). |

**`Action` descriptor:**
```yaml
actionName:
  async: true       # optional, defaults to false
  body: |           # multi-line EiderScript/JS body
    const res = await fetch('/api/data')
    myState = await res.json()
```

**`PersistConfig` descriptor:**
```yaml
persist:
  key: my-custom-key        # localStorage key (default: store id)
  storage: sessionStorage   # 'localStorage' | 'sessionStorage'
  paths: [token, user]      # only persist listed keys
  omit: [tempFlag]          # exclude listed keys
```

**Minimal example:**
```yaml
id: counter
state:
  count: 0
getters:
  doubled: count * 2
actions:
  increment: count++
  reset: count = 0
```

**Full example with async action, watchers, and persistence:**
```yaml
id: user-auth
state:
  user: null
  token: ""
  loading: false
getters:
  isAuthenticated: token !== ""
  displayName: user ? user.name : "Guest"
actions:
  login:
    async: true
    body: |
      loading = true
      const res = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      token = data.token
      user = data.user
      loading = false
  logout: |
    token = ""
    user = null
watch:
  token:
    handler: console.log('Token changed', val)
    immediate: false
persist:
  key: user-auth
  storage: localStorage
  paths: [token, user]
```

**Using a store in a component:**

Stores are globally registered via Pinia and accessed in components using the `useStore` pattern inside actions or methods:
```yaml
name: ProfileCard
actions:
  loadProfile:
    async: true
    body: |
      const store = useUserAuthStore()
      user = store.user
```

---
