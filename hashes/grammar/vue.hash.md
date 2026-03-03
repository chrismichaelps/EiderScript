---
Language: Vue
Version: 3.5.x
Fidelity: 100% (Physical Disk Reference + Full Documentation LLM)
State_ID: BigInt(0x1)
LSP_Discovery_Root: "@root/node_modules/vue/package.json"
Grammar_Lock: "@root/hashes/grammar/vue.hash.md"
---

/** [Project].Grammar.Vue - Linguistic DNA anchor for Vue 3.5+ Composition API */

## [SDK_Discovery_Map]
/** @Ref: @root/node_modules/vue/dist/vue.cjs.js */
/** @Ref: @root/node_modules/@vue/reactivity/dist/reactivity.d.ts */
/** @Ref: @root/node_modules/@vue/runtime-core/dist/runtime-core.d.ts */
/** @Ref: @root/node_modules/@vue/runtime-dom/dist/runtime-dom.d.ts */
/** @Ref: @root/node_modules/@vue/compiler-core/dist/compiler-core.d.ts */
/** @Ref: @root/node_modules/@vue/compiler-dom/dist/compiler-dom.d.ts */
/** @Ref: @root/node_modules/@vue/server-renderer/dist/server-renderer.d.ts */

## [SDK_Imports / Namespaces]
```ts
// Composition API — Reactivity
import {
  ref, reactive, computed, readonly,
  watchEffect, watchPostEffect, watchSyncEffect, watch,
  onWatcherCleanup,
  isRef, unref, toRef, toValue, toRefs,
  isProxy, isReactive, isReadonly,
  shallowRef, triggerRef, customRef,
  shallowReactive, shallowReadonly,
  markRaw, toRaw, effectScope,
} from 'vue'

// Composition API — Lifecycle
import {
  onMounted, onUpdated, onUnmounted,
  onBeforeMount, onBeforeUpdate, onBeforeUnmount,
  onErrorCaptured, onActivated, onDeactivated,
  onServerPrefetch,
} from 'vue'

// Composition API — Component
import {
  defineComponent, defineAsyncComponent,
  useSlots, useAttrs, useId, useTemplateRef,
  provide, inject, hasInjectionContext,
  nextTick, getCurrentInstance,
} from 'vue'

// Application
import { createApp, createSSRApp } from 'vue'

// SSR
import { renderToString } from '@vue/server-renderer'

// Types
import type {
  Ref, ComputedRef, WritableComputedRef,
  MaybeRef, MaybeRefOrGetter,
  UnwrapRef, UnwrapNestedRefs,
  WatchHandle, WatchOptions, WatchSource,
  ComponentPublicInstance, ComponentInternalInstance,
  App, Plugin, DefineComponent,
  InjectionKey, Slots,
  VNode, RendererElement,
} from 'vue'
```

## [Core_Primitives]
```ts
// ref<T>(value: T): Ref<UnwrapRef<T>>
// Reactive mutable reference. Access/mutate via .value. Auto-unwrapped in templates.
const count = ref(0)           // Ref<number>
const msg   = ref<string>('')  // Ref<string>
// Nested objects: deeply reactive via reactive() under the hood.
// To skip deep conversion: shallowRef()

// reactive<T extends object>(target: T): UnwrapNestedRefs<T>
// Deep reactive proxy. Nested refs auto-unwrapped. DO NOT destructure — loses reactivity.
const state = reactive({ count: 0, items: [] as string[] })
// Ref in reactive: state.someRef accessed WITHOUT .value

// computed<T>(getter: () => T): Readonly<Ref<Readonly<T>>>
// computed<T>(options: { get: () => T; set: (v: T) => void }): Ref<T>
const double = computed(() => count.value * 2)
const writable = computed({ get: () => count.value, set: (v) => { count.value = v } })

// readonly<T>(target: T): DeepReadonly<UnwrapNestedRefs<T>>
// Creates deeply readonly proxy. Same ref-unwrapping as reactive().

// MaybeRef<T> = T | Ref<T>                          (3.3+)
// MaybeRefOrGetter<T> = T | Ref<T> | (() => T)      (3.3+)
```

## [Script_Setup_Macros]
```ts
// All macros: compiler-only, no import needed, hoisted to module scope.

// defineProps — declare component props
const props = defineProps<{ foo: string; bar?: number }>()
// Reactive Props Destructure (3.5+): compiler auto-prepends props.
const { foo, bar = 42 } = defineProps<{ foo: string; bar?: number }>()

// defineEmits — declare emitted events
const emit = defineEmits<{
  change: [id: number]       // named tuple syntax (3.3+)
  update: [value: string]
}>()
emit('change', 1)

// defineModel (3.4+) — two-way binding prop
const model = defineModel<string>()                      // → Ref<string | undefined>
const model = defineModel<string>({ required: true })    // → Ref<string>
const count = defineModel<number>('count', { default: 0 })
const [modelValue, modelModifiers] = defineModel<string, 'trim' | 'uppercase'>()

// defineExpose — explicitly expose to parent template refs
defineExpose({ someMethod, someRef })

// defineOptions (3.3+) — component options without separate <script>
defineOptions({ inheritAttrs: false, name: 'MyComponent' })

// defineSlots (3.3+) — type-safe slot declarations
const slots = defineSlots<{
  default(props: { msg: string }): any
  header(): any
}>()

// withDefaults — provide defaults for type-based defineProps (pre-3.5)
const props = withDefaults(defineProps<{ msg?: string; count?: number }>(), {
  msg: 'hello',
  count: 0,
})
```

## [Reactivity_Core]
```ts
// watchEffect(effect, options?): WatchHandle
// Runs immediately, auto-tracks dependencies, reruns on change.
// flush: 'pre' (default) | 'post' | 'sync'
const stop = watchEffect((onCleanup) => {
  const cancel = doWork(id.value)
  onCleanup(cancel)   // cancel on re-run or stop
})
// 3.5+: onWatcherCleanup() instead of onCleanup param
import { onWatcherCleanup } from 'vue'
watchEffect(() => {
  const cancel = doWork(id.value)
  onWatcherCleanup(cancel)
})
stop()          // stop watching
stop.pause()    // pause (3.5+)
stop.resume()   // resume (3.5+)

// watchPostEffect — alias watchEffect with flush:'post'
// watchSyncEffect  — alias watchEffect with flush:'sync'

// watch(source, callback, options?): WatchHandle
// Lazy by default. source: Ref | getter | reactive | array thereof.
watch(count, (newVal, oldVal, onCleanup) => { /* ... */ })
watch(() => state.count, (newVal, oldVal) => { /* ... */ })
watch([fooRef, barRef], ([foo, bar], [prevFoo, prevBar]) => { /* ... */ })
// options: immediate, deep (bool | number depth in 3.5+), flush, once (3.4+)
watch(src, cb, { immediate: true, deep: true, once: true })

interface WatchOptions {
  immediate?: boolean
  deep?: boolean | number         // number = max traversal depth (3.5+)
  flush?: 'pre' | 'post' | 'sync'
  once?: boolean                  // 3.4+
}
interface WatchHandle {
  (): void          // stop
  pause(): void     // 3.5+
  resume(): void    // 3.5+
  stop(): void
}
```

## [Reactivity_Utilities]
```ts
// isRef<T>(r): r is Ref<T>    — type guard
// unref<T>(ref: T | Ref<T>): T — sugar: isRef(v) ? v.value : v

// toRef — normalize value/ref/getter → Ref (3.3+ normalization sig)
toRef(existingRef)           // returns as-is
toRef(() => props.foo)       // readonly ref calling getter on .value
toRef(1)                     // equivalent to ref(1)
toRef(state, 'foo')          // 2-way linked ref to reactive property
toRef(state, 'foo', defaultVal)

// toValue<T>(source: T | Ref<T> | (() => T)): T  (3.3+)
// Like unref but also invokes getter functions
toValue(1)             // 1
toValue(ref(1))        // 1
toValue(() => 1)       // 1

// toRefs<T>(reactive: T): { [K in keyof T]: ToRef<T[K]> }
// Convert reactive object → plain object of 2-way linked refs (safe to destructure)
const { foo, bar } = toRefs(state)

// isProxy(val): boolean  — is reactive or readonly proxy
// isReactive(val): boolean
// isReadonly(val): boolean
// markRaw<T>(val: T): T  — exclude from reactivity forever
// toRaw<T>(proxy: T): T  — get underlying raw object
// effectScope(): EffectScope — collect effects/watchers for batch disposal
const scope = effectScope()
scope.run(() => { watchEffect(...); computed(...) })
scope.stop()  // stops all effects in scope
```

## [Reactivity_Advanced]
```ts
// shallowRef<T>(value: T): ShallowRef<T>
// Only .value assignment is reactive (no deep conversion). Use triggerRef() for manual.
const sRef = shallowRef({ nested: { count: 0 } })
sRef.value.nested.count++   // NOT reactive
triggerRef(sRef)             // force trigger watchers

// customRef<T>(factory): Ref<T>
// Full control over get/set and when to track/trigger.
function useDebouncedRef<T>(value: T, delay = 200) {
  return customRef<T>((track, trigger) => ({
    get() { track(); return value },
    set(newVal) { clearTimeout(timer); timer = setTimeout(() => { value = newVal; trigger() }, delay) }
  }))
}

// shallowReactive<T>(target): T  — only root-level properties reactive
// shallowReadonly<T>(target): Readonly<T>  — only root-level readonly
```

## [Lifecycle_Hooks]
```ts
// ALL must be called synchronously during setup().
// Not called during SSR (unless noted).

onBeforeMount(() => void)     // before first DOM render; no DOM yet
onMounted(() => void)         // DOM rendered; use for DOM access, subscriptions
onBeforeUpdate(() => void)    // reactive state changed; before DOM update
onUpdated(() => void)         // DOM updated; DO NOT mutate state here (infinite loop)
onBeforeUnmount(() => void)   // component still functional; cleanup timers, listeners
onUnmounted(() => void)       // component fully unmounted; all children unmounted
onActivated(() => void)       // component inserted from <KeepAlive> cache
onDeactivated(() => void)     // component removed into <KeepAlive> cache

// Error handling
onErrorCaptured((err: unknown, instance: ComponentPublicInstance | null, info: string) => boolean | void)
// Return false → prevents error from propagating to app.config.errorHandler

// Dev-only debug hooks
onRenderTracked((e: DebuggerEvent) => void)
onRenderTriggered((e: DebuggerEvent) => void)

// SSR only
onServerPrefetch(async () => {
  data.value = await fetchOnServer()
})
// Server renders: waits for Promise. Client: falls through to onMounted.
```

## [Component_API]
```ts
// SFC <script setup> — preferred; executes per instance
// SFC <script> — module scope, executes once on component import

// defineComponent — for type inference in Options API / render functions
const MyComp = defineComponent({
  props: { foo: String },
  setup(props, { emit, attrs, slots, expose }) {
    expose({ publicMethod })
    return { count: ref(0) }
  }
})

// defineAsyncComponent — lazy-loaded components
const AsyncComp = defineAsyncComponent(() => import('./HeavyComp.vue'))
const AsyncComp = defineAsyncComponent({
  loader: () => import('./Comp.vue'),
  loadingComponent: Spinner,
  errorComponent: ErrorBoundary,
  delay: 200,
  timeout: 3000,
})

// Template refs
const el = ref<HTMLDivElement | null>(null)        // <div ref="el">
const compRef = ref<InstanceType<typeof MyComp>>() // <MyComp ref="compRef">
// 3.5+ useTemplateRef:
const input = useTemplateRef<HTMLInputElement>('myInput')

// Provide / Inject
const ThemeKey: InjectionKey<string> = Symbol('theme')
provide(ThemeKey, 'dark')
const theme = inject(ThemeKey)                     // string | undefined
const theme = inject(ThemeKey, 'light')            // string (default)
const theme = inject(ThemeKey, () => 'light', true) // lazy default
// app.provide(key, value): app-level provide for all descendants

// useSlots(): Slots — access slots programmatically
// useAttrs(): equivalent to $attrs — non-prop attributes including class, style

// nextTick(fn?: () => void): Promise<void>
// Defers fn to after next DOM update flush. Await or pass callback.
await nextTick()
nextTick(() => { /* post-update DOM access */ })
```

## [Application_API]
```ts
function createApp(rootComponent: Component, rootProps?: object): App
function createSSRApp(rootComponent: Component, rootProps?: object): App

interface App {
  mount(rootContainer: Element | string): ComponentPublicInstance
  unmount(): void
  onUnmount(cb: () => void): void  // 3.5+
  use(plugin: Plugin, ...options: any[]): this
  component(name: string): Component | undefined
  component(name: string, component: Component): this
  directive(name: string): Directive | undefined
  directive(name: string, directive: Directive): this
  provide<T>(key: InjectionKey<T> | string | symbol, value: T): this
  mixin(mixin: ComponentOptions): this  // @deprecated
  runWithContext<T>(fn: () => T): T    // 3.3+
  config: {
    errorHandler?: (err: unknown, instance: ComponentPublicInstance | null, info: string) => void
    warnHandler?: (msg: string, instance: ComponentPublicInstance | null, trace: string) => void
    globalProperties: Record<string, any>
    optionMergeStrategies: Record<string, OptionMergeFunction>
    performance: boolean
    compilerOptions: RuntimeCompilerOptions
  }
}

// Plugin shape
interface Plugin {
  install(app: App, ...options: any[]): void
}

// Bootstrap pattern
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter } from 'vue-router'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(createRouter({ ... }))
app.mount('#app')
```

## [Template_Directives]
```ts
// v-bind — dynamic attribute/prop binding
// :attr="expr" shorthand. v-bind="obj" spreads all props.
// :class and :style accept arrays, objects, or strings.

// v-on — event listener
// @event="handler" shorthand. @click.stop @submit.prevent etc.
// Modifiers: .stop .prevent .self .capture .once .passive .left .right .middle .exact

// v-model — two-way binding
// <input v-model="val">  equivalent to :value="val" @input="val=$event.target.value"
// v-model:propName for named models (components)
// Modifiers: .trim .number .lazy

// v-if / v-else-if / v-else — conditional rendering (destroys/recreates DOM)
// v-show — toggle display:none (keeps in DOM)
// v-for="item in items" :key="item.id" — list rendering (ALWAYS use :key)
// v-for with destructure: v-for="({ id, text }, index) in items"
// v-for on component: v-for="item in items" always provide :key

// v-slot — named/scoped slots
// <template v-slot:header="slotProps"> or #header="slotProps"
// Default slot: v-slot:default or just v-slot or #default

// v-pre — skip compilation for this subtree
// v-once — render once, never re-render (no reactivity)
// v-memo="[dep1, dep2]" — skip re-render if deps unchanged (3.2+)
// v-cloak — remove when Vue finishes compiling (used with [v-cloak]{display:none})

// Custom directives
const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
  updated: (el: HTMLElement, binding: DirectiveBinding) => { /* ... */ },
}
// Hooks: created, beforeMount, mounted, beforeUpdate, updated, beforeUnmount, unmounted
interface DirectiveBinding<V = unknown> {
  value: V; oldValue: V | null; arg?: string
  modifiers: Record<string, boolean>; instance: ComponentPublicInstance | null
  dir: ObjectDirective
}
```

## [Built_In_Components]
```ts
// <Transition> — enter/leave animations for single elements
// Props: name, appear, mode ('out-in'|'in-out'), css, type, duration, enterFromClass, etc.
// <TransitionGroup> — list animations with tag prop

// <KeepAlive> — cache component instances
// Props: include (string|RegExp|array), exclude, max (LRU limit)
// Hooks: onActivated, onDeactivated (instead of mounted/unmounted for cached)

// <Teleport> — render children into different DOM node
// Props: to (CSS selector or actual element), disabled
// <Teleport to="#modals"> ... </Teleport>
// Deferred teleport (3.5+): defer prop waits until after render

// <Suspense> — async component boundaries (experimental)
// Slots: default (#default), fallback (#fallback)
// Works with: async setup(), defineAsyncComponent, <script setup> top-level await
```

## [Composables_Pattern]
```ts
// Composable: function starting with 'use', encapsulating stateful reactive logic.
// MUST be called during component setup() (synchronous context).

function useMouse() {
  const x = ref(0)
  const y = ref(0)
  function onMousemove(e: MouseEvent) {
    x.value = e.clientX
    y.value = e.clientY
  }
  onMounted(() => window.addEventListener('mousemove', onMousemove))
  onUnmounted(() => window.removeEventListener('mousemove', onMousemove))
  return { x: readonly(x), y: readonly(y) }
}

// Accepts MaybeRefOrGetter for flexible composable args (3.3+):
function useFeature(id: MaybeRefOrGetter<number>) {
  watch(() => toValue(id), (newId) => { /* react */ })
}
// Caller: useFeature(1), useFeature(ref(1)), useFeature(() => props.id)
```

## [SSR]
```ts
// Server rendering: renderToString from @vue/server-renderer
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

const app = createSSRApp(RootComponent)
const html = await renderToString(app)
// Output: hydrate on client with createSSRApp (NOT createApp) + app.mount()

// onServerPrefetch: fetch data on server before rendering
onServerPrefetch(async () => {
  data.value = await fetchOnServer()
})

// State serialization: serialize pinia state for hydration
// On server: const pinia = createPinia(); app.use(pinia)
// After render: JSON.stringify(pinia.state.value) → inject into HTML
// On client: pinia.state.value = JSON.parse(serialized)

// SSR-only env check
if (typeof window === 'undefined') { /* server */ }
import.meta.env.SSR   // Vite SSR flag
```

## [Architectural_Laws]
- **Composition_Law**: Use `<script setup>` + Composition API. Options API only for legacy.
- **Ref_Law**: Use `ref()` for primitives and component-level state. Use `reactive()` for
  complex objects where destructuring is NOT needed. Prefer `ref` over `reactive` by default.
- **Destructure_Law**: NEVER destructure reactive objects — use `toRefs()` or keep as
  `state.prop`. Exception: `defineProps` destructure IS safe in 3.5+ (`<script setup>`).
- **Watcher_Law**: Use `watchEffect` for tracking multiple deps automatically. Use `watch`
  when you need old/new values or want lazy evaluation. Use `watch(..., { once })` for
  one-shot watchers.
- **Composable_Law**: Composables MUST be called synchronously during `setup()`. Name with
  `use` prefix. Return readonly refs to prevent callers from mutating internal state.
- **Plugin_Law**: Plugins install via `app.use(plugin)` BEFORE `app.mount()`.
- **Key_Law**: ALWAYS provide `:key` on `v-for` items. Use stable unique IDs, not index.
- **Next_Tick_Law**: Access updated DOM inside `nextTick()` or `onUpdated()`.

## [Syntax_Rules] | [Naming_Conventions]
- PascalCase: Component names (`<MyComponent>`), `defineComponent`, `defineAsyncComponent`
- camelCase: composables (`useMousePosition`), emits (`update:modelValue`), template refs
- kebab-case: prop/attribute names in templates (Vue normalizes both)
- `use` prefix: ALL composables (required, not optional)
- `v` prefix: ALL custom directives (`vFocus`, not `focus`)
- Component files: PascalCase (`MyButton.vue`)
- `InjectionKey<T>`: typed Symbol for provide/inject type safety

## [Prohibited_Patterns]
- NO `this` inside `setup()` — returns `undefined`
- NO mutating `props` directly — emit events or use `defineModel`
- NO `data()` in new Composition API code — use `ref`/`reactive`
- NO mixins — use composables instead
- NO unkeyed `v-for` — always provide `:key`
- NO reactivity loss from destructuring `reactive()` — use `toRefs()`
- NO DOM access in `onBeforeMount` — DOM not yet created
- NO state mutation in `onUpdated` — causes infinite update loop
- NO side effects in `computed` getters — getters must be pure
- NO `any` casts for component instance types — use `InstanceType<typeof Comp>`
- NO `ref` without `.value` in `<script>` — only auto-unwrapped in templates
```

## [Standard_Library_Signatures]
```ts
// Application
createApp(RootComp, rootProps?): App
createSSRApp(RootComp, rootProps?): App

// Reactivity Core
ref<T>(value: T): Ref<UnwrapRef<T>>
reactive<T extends object>(target: T): UnwrapNestedRefs<T>
computed<T>(getter: (oldValue?: T) => T, debugOptions?): Readonly<Ref<Readonly<T>>>
computed<T>(options: { get: () => T; set: (v: T) => void }): Ref<T>
readonly<T extends object>(target: T): DeepReadonly<UnwrapNestedRefs<T>>
watch<T>(source: WatchSource<T>, cb: WatchCallback<T>, opts?: WatchOptions): WatchHandle
watchEffect(effect: (onCleanup: OnCleanup) => void, opts?: WatchEffectOptions): WatchHandle
onWatcherCleanup(fn: () => void, failSilently?: boolean): void   // 3.5+

// Reactivity Utilities
isRef<T>(r: unknown): r is Ref<T>
unref<T>(ref: T | Ref<T>): T
toRef<T>(value: T): T extends () => infer R ? Readonly<Ref<R>> : T extends Ref ? T : Ref<UnwrapRef<T>>
toRef<T extends object, K extends keyof T>(object: T, key: K, defaultValue?: T[K]): ToRef<T[K]>
toValue<T>(source: T | Ref<T> | (() => T)): T                   // 3.3+
toRefs<T extends object>(object: T): { [K in keyof T]: ToRef<T[K]> }
isProxy(val: unknown): boolean
isReactive(val: unknown): boolean
isReadonly(val: unknown): boolean
markRaw<T extends object>(val: T): T
toRaw<T>(proxy: T): T
effectScope(detached?: boolean): EffectScope

// Advanced
shallowRef<T>(value: T): ShallowRef<T>
triggerRef(ref: ShallowRef): void
customRef<T>(factory: (track: () => void, trigger: () => void) => { get(): T; set(v: T): void }): Ref<T>
shallowReactive<T extends object>(target: T): ShallowReactive<T>
shallowReadonly<T extends object>(target: T): Readonly<T>

// Lifecycle (Composition API)
onMounted(cb: () => void): void
onUpdated(cb: () => void): void
onUnmounted(cb: () => void): void
onBeforeMount(cb: () => void): void
onBeforeUpdate(cb: () => void): void
onBeforeUnmount(cb: () => void): void
onErrorCaptured(cb: ErrorCapturedHook): void
onActivated(cb: () => void): void
onDeactivated(cb: () => void): void
onServerPrefetch(cb: () => Promise<any>): void

// Component helpers
defineComponent(options: ComponentOptionsWithObjectProps): DefineComponent
defineAsyncComponent(loader: () => Promise<Component>): AsyncComponentLoader
useSlots(): Slots
useAttrs(): AttrsValue
useId(): string                                  // 3.5+
useTemplateRef<T>(key: string): Readonly<Ref<T>> // 3.5+
provide<T>(key: InjectionKey<T> | string, value: T): void
inject<T>(key: InjectionKey<T> | string): T | undefined
inject<T>(key: InjectionKey<T> | string, defaultValue: T, treatDefaultAsFactory?: false): T
inject<T>(key: InjectionKey<T> | string, factory: () => T, treatDefaultAsFactory: true): T
nextTick(fn?: () => void): Promise<void>
getCurrentInstance(): ComponentInternalInstance | null
```

## [Tactical_Patterns]
```ts
// 1. Composable with cleanup
function useEventListener<K extends keyof WindowEventMap>(
  target: EventTarget,
  event: K,
  handler: (e: WindowEventMap[K]) => void,
) {
  onMounted(() => target.addEventListener(event, handler))
  onUnmounted(() => target.removeEventListener(event, handler))
}

// 2. Async data composable
function useAsyncData<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null)
  const error = ref<unknown>(null)
  const loading = ref(true)
  onMounted(async () => {
    try { data.value = await fetcher() }
    catch (e) { error.value = e }
    finally { loading.value = false }
  })
  return { data: readonly(data), error: readonly(error), loading: readonly(loading) }
}

// 3. v-model composable helper
function useVModel<T>(props: { modelValue: T }, emit: (e: 'update:modelValue', v: T) => void) {
  return computed<T>({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })
}

// 4. Typed provide/inject
const CounterKey: InjectionKey<Ref<number>> = Symbol('counter')
// Parent:
provide(CounterKey, ref(0))
// Child:
const counter = inject(CounterKey)!  // Ref<number>

// 5. Memo + effectScope pattern
const scope = effectScope()
const derived = scope.run(() => computed(() => expensiveComputation(state.value)))
onUnmounted(() => scope.stop())
```
