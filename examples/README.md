# EiderScript — Example Catalog

> **@EiderScript.Examples.Catalog — Real-world `.eider.yaml` component.**

This directory serves as the **Living Integration Suite** for EiderScript's YAML DSL. Each file is a standalone component demonstrating one or more surface areas of the runtime, compiler, and directive system.

---

## I. Registry

| Shard          | File                                                   | Directives / Features                                      |
| -------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| `counter`      | [`counter.eider.yaml`](./counter.eider.yaml)           | `signals`, `computeds`, `methods`, `{{ }}` interpolation   |
| `todo-app`     | [`todo-app.eider.yaml`](./todo-app.eider.yaml)         | `v-for`, `v-if`, `v-model`, `v-show`, computed filters     |
| `auth-form`    | [`auth-form.eider.yaml`](./auth-form.eider.yaml)       | `v-model`, `v-if` error states, validation signals         |
| `theme-toggle` | [`theme-toggle.eider.yaml`](./theme-toggle.eider.yaml) | Tailwind `dark:` variants, boolean signal toggle           |
| `product-card` | [`product-card.eider.yaml`](./product-card.eider.yaml) | `v-bind`, `:class`, hover states, badge conditionals       |
| `modal`        | [`modal.eider.yaml`](./modal.eider.yaml)               | `v-show`, `v-if`, `group`/`peer` Tailwind, animation       |
| `dashboard`    | [`dashboard.eider.yaml`](./dashboard.eider.yaml)       | Full layout: sidebar nav, stats cards, data table, `v-for` |

---

## II. DSL Grammar Reference

### Key Syntax Anatomy

```yaml
tag .class #id @event=method :prop=expr v-if=cond v-for="item in list"
```

Every space-delimited token on a YAML key is parsed by the **Template Compiler** (`@root/src/compiler/template.compiler.ts`) through the `DIRECTIVE` regex defined in `@root/src/config/constants.ts`.

### Directive Dispatch Table

| Token | Compiled To | Grammar Ref |
|-------|-------------|-------------|
| `.className` | `class="className"` (static) | `@root/hashes/src/compiler/template.hash.md` |
| `#id` | `id="id"` | `@root/hashes/src/compiler/template.hash.md` |
| `@event=method` | `onEvent` VNode prop | `@root/hashes/src/directives/v-model.hash.md` |
| `:prop=expr` | Dynamic binding via `compileVBind` | `@root/hashes/src/directives/v-bind.hash.md` |
| `v-if=expr` | `compileVIf` → conditional VNode | `@root/hashes/src/directives/v-if.hash.md` |
| `v-else-if=expr` | `compileVIfChain` branch | `@root/hashes/src/directives/v-if.hash.md` |
| `v-else` | `compileVIfChain` fallback | `@root/hashes/src/directives/v-if.hash.md` |
| `v-for="item in list"` | `compileVFor` → keyed list | `@root/hashes/src/directives/v-for.hash.md` |
| `v-model=signal` | `compileVModel` → two-way bind | `@root/hashes/src/directives/v-model.hash.md` |
| `v-show=expr` | `compileVShow` → `display:none` | `@root/hashes/src/directives/v-show.hash.md` |

### Interpolation & Filters

```yaml
text: "{{ value | filter:arg }}"
```

The pipe operator (`|`) invokes the filter runtime (`@root/src/runtime/filters.ts`). `splitPipeExpr` detects and separates filter chains from boolean-OR expressions. Built-in filters:

| Filter | Signature | Example |
|--------|-----------|---------|
| `capitalize` | `capitalize` | `{{ name \| capitalize }}` |
| `upper` / `lower` | `upper`, `lower` | `{{ label \| upper }}` |
| `trim` | `trim` | `{{ input \| trim }}` |
| `truncate` | `truncate:N` | `{{ bio \| truncate:80 }}` |
| `currency` | `currency:CODE` | `{{ price \| currency:USD }}` |
| `number` | `number:N` | `{{ ratio \| number:2 }}` |
| `join` | `join:SEP` | `{{ tags \| join:', ' }}` |
| `reverse` | `reverse` | `{{ items \| reverse }}` |
| `first` / `last` | `first`, `last` | `{{ list \| first }}` |
| `json` | `json` | `{{ payload \| json }}` |
| `default` | `default:FALLBACK` | `{{ label \| default:N/A }}` |

### Component Schema

```yaml
name: ComponentName
signals:
  key: initialValue     # Vue ref() — reactive state
computeds:
  key: "expr"           # Vue computed() — derived state
methods:
  key: "expr"           # callable side effects
template:
  tag .class:           # root element — compiled to h() call
    child: content
```

---

## III. Architectural Laws (FMCF Enforcement)

> **Zero-Inference Policy:** These examples are Grammar-Locked. Any new directive or DSL construct MUST have a corresponding hash shard in `@root/hashes/` before it can appear in an example.

| Law | Enforcement |
|-----|-------------|
| **Export Law** | Components export a single `compileComponent()` Effect pipeline. No naked VNode leakage. |
| **Transformation Law** | YAML → `EiderComponent` mapping is the sole responsibility of `yaml.parser.ts`. |
| **Propagation Law** | Parser errors bubble through `EiderParseError`; compiler errors through `EiderCompileError`. Raw errors do not cross shard boundaries. |
| **Path Law** | All `hash_reference` and `parent_bridge` paths are `@root`-relative. Absolute OS paths are prohibited. |

---

> **Grammar Reference:** `@root/hashes/grammar/typescript.hash.md` · `@root/hashes/grammar/vue.hash.md`
