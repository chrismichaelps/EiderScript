# Template Engine (`EiderAST`)

EiderScript features a high-performance, CSS-shorthand template engine that compiles to standard Vue 3 VNodes.

## **Syntax Shorthand**
Elements can be defined using a compact tag-class-id string:
```yaml
div .flex .items-center #main-container: "Hello World"
```
*Compiles to:* `<div id="main-container" class="flex items-center">Hello World</div>`

## **Directives & Events**
EiderScript exposes the full range of Vue directive capabilities via YAML keys or inline tokens.

| Feature | Syntax | Logic Scope | Example |
| :--- | :--- | :--- | :--- |
| **Conditional** | `v-if`, `v-else-if`, `v-else` | Scope | `v-if: isAuthenticated` |
| **Iteration** | `v-for` | Nested Scope | `v-for: item in items` |
| **Two-way Binding** | `v-model` | Reactive | `v-model: username` |
| **Event Handling** | `@eventName` | Procedural | `@click: handleSubmit` |
| **Dynamic Props** | `:propName` | Reactive | `:disabled: !isValid` |
| **Interpolation** | `{{ expr }}` | Text | `span: "Welcome, {{ user.name }}"` |
| **Visibility** | `v-show` | Layout | `v-show: isVisible` |
| **Manual Slot** | `v-slot:name` | Scope | `v-slot:header: "Custom Title"` |
| **Raw HTML** | `v-html` | Unsafe | `v-html: richContent` |
| **Static Text** | `v-text` | Safe | `v-text: safeContent` |

### **Event Modifiers**
EiderScript supports native Vue event modifiers for granular control:
- `@click.stop`: `stopPropagation()`
- `@submit.prevent`: `preventDefault()`
- `@click.self`: Only triggers if `event.target` is the element itself.

Modifiers can be chained: `@click.stop.prevent: doSomething`.

## **Node Structure (Detailed)**
For complex nodes, use the expanded object format:

```yaml
button .btn-primary:
  v-if: isReady
  @click.prevent: startProcess
  attrs:
    type: submit
    aria-label: "Submit Form"
  children:
    - span .icon: "🚀"
    - text: "Enter System"
```
