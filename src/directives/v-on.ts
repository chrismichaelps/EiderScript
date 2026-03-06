/** @EiderScript.Directives.VOn — Event listener binding with full modifier support */
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
  if (!eventName) {
    try {
      const bindings = scope.evaluate(expr)
      if (typeof bindings === 'object' && bindings !== null) {
        for (const [key, handler] of Object.entries(bindings)) {
          result[`on${key.charAt(0).toUpperCase()}${key.slice(1)}`] = handler
        }
      }
    } catch {
      // Malformed expression — return empty bindings
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

  try {
    const rawHandler = scope.evaluate(expr)

    // Null/undefined — preserve expression string as fallback
    if (rawHandler == null) {
      result[propName] = expr
      return result
    }

    // String — resolve as method name from scope
    if (typeof rawHandler === 'string') {
      const method: unknown = scope.methods[rawHandler]
      result[propName] =
        typeof method === 'function'
          ? (...args: unknown[]): unknown => {
              const result = (method as EventHandler)(...args)
              if (result instanceof Promise) {
                result.catch((err) =>
                  console.error(`Error in async method "${rawHandler}":`, err),
                )
              }
              return result
            }
          : rawHandler
      return result
    }

    // Function — wrap if runtime modifiers present
    if (typeof rawHandler === 'function') {
      const handler = rawHandler as EventHandler
      const needsWrapper = modifiers.some((m) => RUNTIME_MODIFIERS.has(m))
      result[propName] = needsWrapper
        ? wrapWithModifiers(handler, modifiers)
        : handler
      return result
    }

    // Any other evaluated value — pass through
    result[propName] = rawHandler
  } catch {
    result[propName] = expr
  }

  return result
}
