# EiderScript Examples

A collection of real-world `.eider.yaml` component examples demonstrating EiderScript's YAML DSL.

## Files

| Example | Description |
|---------|-------------|
| `counter.eider.yaml` | Basic counter with signals, computed, and methods |
| `todo-app.eider.yaml` | Full todo list with v-for, v-if, v-model, and filtering |
| `auth-form.eider.yaml` | Login form with validation state, v-model, and conditional errors |
| `dashboard.eider.yaml` | Admin dashboard with sidebar nav, stats cards, and data table |
| `theme-toggle.eider.yaml` | Dark/light mode toggle using Tailwind dark: variants |
| `modal.eider.yaml` | Animated modal dialog with v-show/v-if and group/peer patterns |
| `product-card.eider.yaml` | E-commerce product card with hover states and badge variants |

## YAML Key Syntax at a Glance

```yaml
tag .class #id @event=method :prop=expr v-if=cond v-for="item in list"
```

- `.class`  → CSS class
- `#id`     → element id
- `@click=method` → event handler
- `:prop=expr`    → dynamic binding
- `v-if=expr`     → conditional render
- `v-for="item in list"` → list render
- `v-model=signal`       → two-way bind
- `v-show=expr`          → display toggle
