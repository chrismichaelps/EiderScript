---
Language: Pinia
Version: 3.x (3.0.4)
Fidelity: 100% (Physical Disk Reference)
State_ID: BigInt(0x1)
LSP_Discovery_Root: "@root/node_modules/pinia/package.json"
Grammar_Lock: "@root/hashes/grammar/pinia.hash.md"
---

/** [Project].Grammar.Pinia - Linguistic DNA anchor for Pinia 3.x */

## [SDK_Discovery_Map]
/** @Ref: @root/node_modules/pinia/dist/pinia.d.ts (1038 lines) */
/** Single bundled declaration file. All exports below are verified from disk. */

## [SDK_Imports / Namespaces]
```ts
import {
  createPinia,
  defineStore,
  storeToRefs,
  setActivePinia,
  getActivePinia,
  disposePinia,
  mapState, mapGetters,   // mapGetters is deprecated alias for mapState
  mapActions,
  mapStores,
  mapWritableState,
  setMapStoreSuffix,
  acceptHMRUpdate,
  skipHydrate,
  shouldHydrate,
} from 'pinia'

import type {
  Pinia,
  Store,
  StoreDefinition,
  StoreGeneric,
  StoreState,
  StoreGetters,
  StoreActions,
  PiniaPlugin,
  PiniaPluginContext,
  PiniaCustomProperties,
  PiniaCustomStateProperties,
  DefineStoreOptions,
  DefineSetupStoreOptions,
  DefineStoreOptionsBase,
  StateTree,
  MutationType,
  SubscriptionCallback,
  SubscriptionCallbackMutation,
  StoreOnActionListener,
  SetupStoreDefinition,
} from 'pinia'
```

## [Core_API]
```ts
// createPinia(): Pinia
// Creates the Pinia instance. Install via app.use(createPinia()).
// Must be created BEFORE any store is used.
const pinia = createPinia()
app.use(pinia)

// Pinia interface
interface Pinia {
  install: (app: App) => void
  state: Ref<Record<string, StateTree>>  // root state across all stores
  use(plugin: PiniaPlugin): Pinia        // add plugin
}

// defineStore — two overloads (Options Store vs Setup Store)

// 1. Options Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0, name: 'counter' }),    // MUST be arrow function
  getters: {
    double: (state) => state.count * 2,            // getter receives UnwrapRef<S>
    doubleFromThis(): number { return this.count * 2 },  // can use 'this' (typed)
  },
  actions: {
    increment() { this.count++ },
    async loadData() {
      const res = await fetch('/api')
      this.count = await res.json()
    },
  },
  hydrate(storeState, initialState) { /* custom SSR hydration */ },
})

// 2. Setup Store (preferred, mirrors Composition API)
const useCounterStore = defineStore('counter', (helpers) => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  function increment() { count.value++ }
  async function loadData() { /* ... */ }
  // MUST return ALL state (refs), getters (computedRefs), and actions (functions)
  return { count, double, increment, loadData }
})

// helpers.action(fn, name?): wraps function for $onAction tracking (advanced use)

// StoreDefinition: return type of defineStore()
// type StoreDefinition<Id, S, G, A> — callable: useCounterStore(pinia?)
// useCounterStore.$id — store ID string
```

## [Store_Instance_API]
```ts
// Store<Id, S, G, A> = _StoreWithState<Id,S,G,A> & UnwrapRef<S> & _StoreWithGetters<G> & A
// Accessing usage:
const store = useCounterStore()    // call inside setup() or composable
store.count                        // state — directly accessible, auto-unwrapped
store.double                       // getter — readonly computed
store.increment()                  // action

// $id: Id — unique store identifier string
// $state: UnwrapRef<S> & PiniaCustomStateProperties<S>
//   Setting $state triggers $patch internally: store.$state = { count: 1 }

// $patch — preferred mutation method (atomic, devtools-friendly)
store.$patch({ count: store.count + 1 })            // partial state object (DeepPartial<S>)
store.$patch((state) => { state.items.push('new') }) // mutator function (must be sync!)

// $reset(): void — reset to initial state (Options Store only; Setup Store needs manual impl)

// $subscribe — watch state changes
const unsub = store.$subscribe((mutation, state) => {
  // mutation.type: MutationType.direct | MutationType.patchObject | MutationType.patchFunction
  // mutation.storeId: string
  // state: UnwrapRef<S> — current state after mutation
}, { detached: false })  // detached: true = survive component unmount
unsub()  // stop subscription

// $onAction — intercept actions
const unsub = store.$onAction(({ name, store, args, after, onError }) => {
  // name: action name string
  // args: Parameters of the action
  after((result) => { /* runs after successful completion, result = return value */ })
  onError((error) => { /* runs if action throws; return false to suppress */ })
}, /* detached?: boolean */)
unsub()

// $dispose(): void — stop effectScope, remove from registry
// Does NOT delete state. To fully reset: delete pinia.state.value[store.$id]

// MutationType enum (for $subscribe)
enum MutationType {
  direct = 'direct',               // store.prop = newValue
  patchObject = 'patch object',    // store.$patch({ ... })
  patchFunction = 'patch function' // store.$patch(state => { ... })
}
```

## [Reactive_Destructuring]
```ts
// storeToRefs<SS extends StoreGeneric>(store: SS): StoreToRefs<SS>
// Like Vue's toRefs() but Pinia-specific.
// Extracts: state (as Ref) + getters (as ComputedRef). Ignores actions.
// USE THIS for reactive destructuring — plain destructuring loses reactivity.

const store = useCounterStore()

// WRONG — count/double lose reactivity
const { count, double, increment } = store

// CORRECT — count is Ref<number>, double is ComputedRef<number>
const { count, double } = storeToRefs(store)
const { increment } = store   // actions: destructure directly (functions, not reactive)

count.value++   // mutates store.count reactively
```

## [Plugin_API]
```ts
// PiniaPlugin: called once per store creation
interface PiniaPlugin {
  (context: PiniaPluginContext): Partial<PiniaCustomProperties & PiniaCustomStateProperties> | void
}

interface PiniaPluginContext<Id, S, G, A> {
  pinia: Pinia
  app: App
  store: Store<Id, S, G, A>
  options: DefineStoreOptionsInPlugin<Id, S, G, A>  // defineStore options
}

// Registering a plugin
pinia.use((context) => {
  // Add property to every store
  context.store.someSharedProp = ref(0)
  // Add watchers, integrate with devtools, etc.
})

// Extending type declarations for plugin properties
declare module 'pinia' {
  export interface PiniaCustomProperties {
    // Properties added by plugins
    $router: Router
  }
  export interface PiniaCustomStateProperties<S> {
    // Properties added to $state by plugins
  }
}
```

## [SSR]
```ts
// Server: create new Pinia per request (NEVER share between requests)
const pinia = createPinia()
const app = createSSRApp(RootComponent)
app.use(pinia)
const html = await renderToString(app)
// Serialize state for hydration
const initialState = JSON.stringify(pinia.state.value)
// Inject into HTML: <script>window.__pinia__ = ${initialState}</script>

// Client hydration
const pinia = createPinia()
if (window.__pinia__) pinia.state.value = JSON.parse(window.__pinia__)
const app = createSSRApp(RootComponent)
app.use(pinia)
app.mount('#app')

// skipHydrate<T>(obj: T): T
// Prevent hydration of a specific value in Setup Store (e.g. a Router instance)
const useStore = defineStore('router', () => {
  const router = skipHydrate(useRouter())  // excluded from hydration
  return { router }
})

// Custom hydration (Options Store): hydrate(storeState, initialState)
// For stores that use customRef/computed in state that can't be simply copied

// setActivePinia(pinia): Pinia — set active Pinia for out-of-component contexts
// getActivePinia(): Pinia | undefined — get currently active Pinia
// disposePinia(pinia): void — cleanup for tests/multi-instance scenarios
```

## [Options_API_Helpers]
```ts
// mapState — spread into computed field (Options API only)
computed: { ...mapState(useCounterStore, ['count', 'double']) }
computed: { ...mapState(useCounterStore, { myCount: 'count', triple: (s) => s.count * 3 }) }

// mapGetters — DEPRECATED alias for mapState
// mapWritableState — state only, generates computed getter+setter
computed: { ...mapWritableState(useCounterStore, ['count']) }  // allows this.count = n

// mapActions — spread into methods field
methods: { ...mapActions(useCounterStore, ['increment', 'loadData']) }
methods: { ...mapActions(useCounterStore, { add: 'increment' }) }  // rename

// mapStores — access whole store as computed property
computed: { ...mapStores(useCounterStore, useUserStore) }
// Access: this.counterStore.count  (suffix configurable via setMapStoreSuffix)
setMapStoreSuffix('')   // this.counter instead of this.counterStore

// acceptHMRUpdate — Vite HMR for stores
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))
}
```

## [Type_Utilities]
```ts
// Extract store shape types from store definition
type CounterStore = ReturnType<typeof useCounterStore>
type CounterState   = StoreState<CounterStore>    // UnwrapRef<S>
type CounterGetters = StoreGetters<CounterStore>  // ComputedRef versions
type CounterActions = StoreActions<CounterStore>  // Plain function types

// StateTree = Record<PropertyKey, any>  — base state constraint
// StoreGeneric = Store<string, StateTree, _GettersTree<StateTree>, _ActionsTree>
// For generic store function params: useGenericFn(store: StoreGeneric)

// SubscriptionCallback<S>: (mutation: SubscriptionCallbackMutation<S>, state: UnwrapRef<S>) => void
// SubscriptionCallbackMutation<S>: union of Direct | PatchObject | PatchFunction types
// StoreOnActionListener<Id, S, G, A>: action interceptor callback type
```

## [Architectural_Laws]
- **Setup_Store_Law**: Prefer Setup Stores — identical mental model to `<script setup>`.
  Setup Stores auto-infer type from return value. Return ALL reactive state and computed.
- **Stale_Destructure_Law**: NEVER `const { count } = useStore()` — reactivity lost.
  ALWAYS use `storeToRefs(store)` for state/getters; destructure actions directly.
- **Patch_Law**: Use `$patch` for batched mutations (atomic, devtools-trackable).
  Direct property assignment (`store.count++`) is OK for single changes.
- **Request_Isolation_Law**: In SSR, create a NEW `createPinia()` per server request.
  Never share a Pinia instance between requests (data leakage).
- **Install_Order_Law**: `app.use(createPinia())` MUST be called before `app.mount()`
  and before any store is accessed.
- **Reset_Law**: `$reset()` only works on Options Stores. For Setup Stores, maintain
  initial state yourself: `const initialCount = 0; function $reset() { count.value = initialCount }`
- **Action_Law**: Actions can be `async`, return Promises. Actions are always wrapped
  so `$onAction` hooks fire correctly. Actions have access to full store via `this`/closure.
- **Plugin_Law**: Plugins run once per store instantiation. Add to `pinia.use()` BEFORE
  any store is created (before `app.use(pinia)` or at minimum before first store call).

## [Syntax_Rules] | [Naming_Conventions]
- `use` prefix: ALL store composables (`useCounterStore`, not `counterStore`)
- Options Store state: MUST be arrow function `state: () => ({ ... })` for correct types
- Getters with `this`: must use non-arrow function for `this` to be typed correctly
- `$id`: string literal type passed to `defineStore` — must be unique across app
- Store files: `stores/counter.ts` (singular, camelCase)
- Getter using another getter: access via `this` in Options Store

## [Prohibited_Patterns]
- NO store access OUTSIDE Vue app context without `setActivePinia` (SSR leak risk)
- NO destructuring store state without `storeToRefs` — breaks reactivity
- NO direct `store.$state.prop = value` — use `$patch` for consistent tracking
- NO sharing Pinia instance between SSR requests
- NO calling `$reset()` on Setup Stores (method doesn't exist unless manually defined)
- NO synchronous `$patch` mutator that returns a Promise (must be sync)
- NO accessing `context.store` in plugin after `$dispose()` is called
- NO `mapGetters` in new code — use `mapState` (mapGetters is deprecated alias)
- NO multiple `createPinia()` in client app — one instance per app

## [Standard_Library_Signatures]
```ts
// Bootstrap
createPinia(): Pinia
pinia.use(plugin: PiniaPlugin): Pinia
app.use(createPinia()): App

// Store Definition
defineStore<Id, S, G, A>(id: Id, options: DefineStoreOptions<Id,S,G,A>): StoreDefinition<Id,S,G,A>
defineStore<Id, SS>(id: Id, setup: (helpers: SetupStoreHelpers) => SS, opts?): StoreDefinition<...>

// Store Instantiation (inside setup() or composable)
useStore(pinia?: Pinia | null): Store<Id, S, G, A>

// Store Instance ($-prefixed members)
store.$id: Id
store.$state: UnwrapRef<S> & PiniaCustomStateProperties<S>
store.$patch(partial: DeepPartial<UnwrapRef<S>>): void
store.$patch(mutator: (state: UnwrapRef<S>) => void): void  // must be sync
store.$reset(): void    // Options Store only
store.$subscribe(callback: SubscriptionCallback<S>, opts?: { detached?: boolean } & WatchOptions): () => void
store.$onAction(callback: StoreOnActionListener<Id,S,G,A>, detached?: boolean): () => void
store.$dispose(): void

// Reactive destructuring
storeToRefs<SS extends StoreGeneric>(store: SS): StoreToRefs<SS>

// Lifecycle
setActivePinia(pinia: Pinia | undefined): Pinia | undefined
getActivePinia(): Pinia | undefined
disposePinia(pinia: Pinia): void

// SSR
skipHydrate<T>(obj: T): T
shouldHydrate(obj: unknown): boolean

// HMR (Vite)
acceptHMRUpdate<SS extends StoreDefinition>(store: SS, hot: any): (newModule: any) => any
```

## [Tactical_Patterns]
```ts
// 1. Setup Store with $reset support
const useCounterStore = defineStore('counter', () => {
  const defaultState = { count: 0, name: '' }
  const count = ref(defaultState.count)
  const name = ref(defaultState.name)
  const double = computed(() => count.value * 2)
  function increment() { count.value++ }
  function $reset() { count.value = defaultState.count; name.value = defaultState.name }
  return { count, name, double, increment, $reset }
})

// 2. Cross-store reference (Setup Store)
const useOrderStore = defineStore('order', () => {
  const userStore = useUserStore()   // valid inside Setup Store
  const orders = ref<Order[]>([])
  const userOrders = computed(() => orders.value.filter(o => o.userId === userStore.id))
  return { orders, userOrders }
})

// 3. Optimistic update pattern
async function updateItem(id: string, data: Partial<Item>) {
  const prev = { ...store.item }      // snapshot
  store.$patch({ item: { ...store.item, ...data } })  // optimistic
  try {
    await api.updateItem(id, data)
  } catch (e) {
    store.$patch({ item: prev })      // rollback
    throw e
  }
}

// 4. $subscribe for persistence
store.$subscribe((mutation, state) => {
  localStorage.setItem(store.$id, JSON.stringify(state))
}, { detached: true })  // detached = survives component unmount

// 5. Plugin: add $reset to all Setup Stores
pinia.use(({ store }) => {
  const initialState = structuredClone(store.$state)
  store.$reset = () => store.$patch(structuredClone(initialState))
})
```
