/** @EiderScript.Directives.VOn: Event listener binding with full modifier support */
import type { Scope } from '../runtime/scope.js'

/** Modifiers that map to Vue addEventListener option suffixes. */
const OPTION_MODIFIER_MAP: Readonly<Record<string, string>> = Object.freeze({
  capture: 'Capture',
  once: 'Once',
  passive: 'Passive',
})

/** Modifiers applied at invocation time inside the event wrapper. */
const RUNTIME_MODIFIERS: ReadonlySet<string> = new Set([
  'stop',
  'prevent',
  'self',
])

type OptionModifier = 'capture' | 'once' | 'passive'
type RuntimeModifier = 'stop' | 'prevent' | 'self'
type EventModifier = OptionModifier | RuntimeModifier
type EventHandler = (...args: unknown[]) => unknown

interface ParsedEvent {
  readonly name: string
  readonly modifiers: readonly EventModifier[]
}

function isEventModifier(value: string): value is EventModifier {
  return value in OPTION_MODIFIER_MAP || RUNTIME_MODIFIERS.has(value)
}

function parseEventString(eventStr: string): ParsedEvent {
  const [name = '', ...rest] = eventStr.split('.')
  return {
    name,
    modifiers: rest.filter(isEventModifier),
  }
}

function normalizeEventProp(
  baseName: string,
  modifiers: readonly EventModifier[],
): string {
  let result = `on${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`
  for (const mod of modifiers) {
    const suffix = OPTION_MODIFIER_MAP[mod]
    if (suffix) result += suffix
  }
  return result
}

function wrapWithModifiers(
  handler: EventHandler,
  modifiers: readonly EventModifier[],
): EventHandler {
  const hasStop = modifiers.includes('stop')
  const hasPrevent = modifiers.includes('prevent')
  const hasSelf = modifiers.includes('self')

  return function (this: unknown, ...args: unknown[]): unknown {
    const event = args[0]

    if (event instanceof Event) {
      if (hasStop) event.stopPropagation()
      if (hasPrevent) event.preventDefault()
      if (hasSelf && event.target !== event.currentTarget) return undefined
    }

    return handler.call(this, ...args)
  }
}

export function compileVOn(
  eventName: string,
  expr: string,
  scope: Scope,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Object syntax: v-on="{ click: handler, keyup: handler }"
  // This is evaluated immediately because it defines the listener map.
  if (!eventName) {
    try {
      const bindings = scope.evaluate(expr)
      if (typeof bindings === 'object' && bindings !== null) {
        for (const [key, handler] of Object.entries(bindings)) {
          result[`on${key.charAt(0).toUpperCase()}${key.slice(1)}`] = handler
        }
      }
    } catch {
      // Malformed expression: return empty bindings
    }
    return result
  }

  // Dynamic event name: v-on:[eventName]="handler"
  let eventBase = eventName
  if (eventName.startsWith('[') && eventName.endsWith(']')) {
    const dynamicKey = eventName.slice(1, -1)
    try {
      const evaluated = scope.evaluate(dynamicKey)
      eventBase = String(evaluated ?? dynamicKey)
    } catch {
      eventBase = dynamicKey
    }
  }

  const { name: baseName, modifiers } = parseEventString(eventBase)
  const propName = normalizeEventProp(baseName, modifiers)

  // Decide whether to pass a method directly or wrap a statement.

  // Simple method name case (e.g. @click="toggleEdit")
  // If expr is a simple identifier and exists in scope.methods, use it directly.
  const isSimpleIdentifier = /^[a-zA-Z_$][\w$]*$/.test(expr.trim())
  if (isSimpleIdentifier) {
    const method = scope.methods[expr.trim()]
    if (typeof method === 'function') {
      const handler = method as EventHandler
      result[propName] = modifiers.some((m) => RUNTIME_MODIFIERS.has(m))
        ? wrapWithModifiers(handler, modifiers)
        : handler
      return result
    }
  }

  // Statement or method-call case (e.g. @click="count++" or @click="save(1)")
  // Wrap in a function that provides $event in a child scope.
  const statementHandler = (...args: unknown[]): unknown => {
    const $event = args[0]
    const childScope = scope.createChild({ $event })
    return childScope.evaluate(expr)
  }

  result[propName] = modifiers.some((m) => RUNTIME_MODIFIERS.has(m))
    ? wrapWithModifiers(statementHandler, modifiers)
    : statementHandler

  return result
}
