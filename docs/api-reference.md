# API Reference

EiderScript provides a high-level, Effect-driven API for compiling YAML manifestations into live Vue 3 applications.

## **Core Factory**

### `createEiderApp(input: EiderAppInput): Effect<EiderApp, RuntimeError>`
The principal entry point for EiderScript. It parses provided YAML documents, compiles components, and router configurations, and returns a managed `EiderApp` instance.

> [!IMPORTANT]
> **Store System (Pinia)**: Currently, the framework does not map the global store system. This feature is planned for future releases.

**Parameters:**
- `input`: An `EiderAppInput` object descriptor.

**Returns:**
- An `Effect` that resolves to an `EiderApp` instance or fails with a `RuntimeError`.

---

## **Types & Interfaces**

### `EiderAppInput`
```typescript
interface EiderAppInput {
  /** Main app YAML content (kind: app) */
  app: string;
  /** Map of named components (kind: component) */
  components?: Record<string, string>;
  /** External Vue plugins for global registration */
  plugins?: Record<string, Plugin>;
  /** Enable SSR initialization */
  ssr?: boolean;
  /** Use memory history for embedded router contexts */
  memoryRouter?: boolean;
}
```

### `EiderApp`
```typescript
interface EiderApp {
  /** Underlying Vue instance */
  readonly vueApp: App;
  /** Compiled Vue Router instance */
  readonly router: Router | null;
  /** Standardized mounting factory */
  readonly mount: (selector: string) => void;
}
```

---

## **Server-Side Rendering (SSR)**

### `renderEider(input: EiderAppInput): Effect<SSRResult, RuntimeError>`
Compiles and renders the application to a static string for hydration.

### `hydrateEider(input: EiderAppInput, selector: string): Effect<EiderApp, RuntimeError>`
Hydrates an SSR-rendered application on the client-side using the identical input manifest.

---

## **Extensibility**

### `createScope(base: object, ...): Scope`
Creates a reactive evaluation scope for EiderScript expressions, useful for custom runtime integrations.
