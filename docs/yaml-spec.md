# YAML Manifest Specification

EiderScript utilizes a declarative YAML format to define application state, logic, and UI. Every manifest is structured as a typed document with a specific `kind`.

## **1. Component Manifest (`kind: component`)**
Components are the foundational reactive units. They encapsulate state, logic, and declarative templates.

| Property | Type | Logic Scope | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | N/A | **Required.** Unique component identifier (PascalCase recommended). |
| `props` | `Record<string, PropDescriptor>` | Read-only | Property contracts: `{ type: 'string'\|'number'\|'boolean'\|'array'\|'object', default?: any }`. |
| `signals` | `Record<string, any>` | Reactive | Local state primitives. Initial values are auto-wrapped in Vue `ref()`. |
| `computeds` | `Record<string, string>` | Reactive | Memoized derivations; keys are EiderScript expressions. |
| `methods` | `Record<string, string \| Action>` | Procedural | Standard logic. Shorthand: `async name: body` or `{ async: true, body: string }`. |
| `actions` | `Record<string, Action>` | Effect | Logic optimized for `Effect.ts`. Can be `async`. Accessible via `this.actionName`. |
| `watch` | `Record<string, WatchEntry>` | Side-effect | Observes signal changes: `{ handler: string, immediate?: boolean, deep?: boolean }`. |
| `provide` | `Record<string, string\|any>` | Injection | Exposes data to children. Can reference signals, computeds, or methods by name. |
| `inject` | `string[] \| Record<string, string>` | Injection | Consumes parent data. Array shorthand or `{ localKey: 'sourceKey' }` mapping. |
| `emits` | `string[]` | Events | Declares custom events. Triggered via `emit('event-name', payload)` in methods/actions. |
| `lifecycle` | `string` | Lifecycle | Logic for `onMounted`, `onUnmounted`, `onBeforeMount`, `onUpdated`. |
| `template` | `EiderAST` | Registry | Declarative UI tree (see [Template Engine](template-engine.md)). |
| `styles` | `object` | Styling | Component CSS: `{ scoped?: boolean, css: string }`. |

---

## **2. Application Manifest (`kind: app`)**
The root orchestration layer defining navigation and global dependencies.

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | **Required.** Root application namespace. |
| `router.routes` | `Route[]` | **Required.** Array of route mapping descriptors. |
| `router.scrollBehavior` | `string` | Managed scroll strategy (`top` or `preserve`). |
| `global.plugins` | `string[]` | Registry of external Vue plugins (Router is internal). |
| `components` | `Component[]` | Inline component manifests (higher priority than external). |
| `template` | `EiderAST` | Optional root layout manifest. |

**Route Descriptor:**
- `path`: **Required.** URL segment pattern.
- `component`: Name of the registered Eider component.
- `redirect`: Navigation target (string or `{ name, path }`).
- `beforeEnter`: EiderScript expression for navigation guards.
- `children`: Recursive array of nested route manifests.

---

> [!IMPORTANT]
> **Store Manifest (`kind: store`)**: The current version of EiderScript does not officially support or map the global store system (Pinia). This functionality is slated for the future roadmap. Implementation of cross-component state should currently rely on `provide/inject` or external Vue plugins.
