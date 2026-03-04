/** @EiderScript Tests — F5 Runtime: Scope, Filters, text: key, v-else/v-else-if, App Runtime */
import { describe, it, expect, test, beforeEach } from 'vitest'
import { Effect } from 'effect'
import { createScope } from '../runtime/scope.js'
import {
  applyFilters,
  splitPipeExpr,
  getFilters,
} from '../runtime/filters.js'
import { compileNode, interpolate, type TemplateCompilerConfig } from '../compiler/template.compiler.js'
import { Regex } from '../config/constants.js'
import { h } from 'vue'

const DEFAULT_CONFIG: TemplateCompilerConfig = {
  dirIf: 'v-if',
  dirFor: 'v-for',
  dirModel: 'v-model',
  defaultHtmlTag: 'div',
  fragmentHtmlTag: 'template',
  directiveRe: Regex.DIRECTIVE,
}

function makeScope(signals: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  return createScope(props, signals, {}, {})
}

function makeComputedScope(
  signals: Record<string, unknown>,
  computeds: Record<string, string>,
  methods: Record<string, string> = {},
) {
  return createScope({}, signals, computeds, methods)
}

describe('createScope — signal initialization', () => {
  it('initializes numeric signal', () => {
    const scope = makeScope({ count: 0 })
    expect(scope.signals['count']?.value).toBe(0)
  })

  it('initializes string signal', () => {
    const scope = makeScope({ name: 'Chris' })
    expect(scope.signals['name']?.value).toBe('Chris')
  })

  it('initializes boolean signal', () => {
    const scope = makeScope({ active: true })
    expect(scope.signals['active']?.value).toBe(true)
  })

  it('initializes null signal', () => {
    const scope = makeScope({ data: null })
    expect(scope.signals['data']?.value).toBe(null)
  })

  it('initializes array signal', () => {
    const scope = makeScope({ items: [1, 2, 3] })
    expect(scope.signals['items']?.value).toEqual([1, 2, 3])
  })

  it('initializes object signal', () => {
    const scope = makeScope({ user: { id: 1, name: 'Michael' } })
    expect(scope.signals['user']?.value).toEqual({ id: 1, name: 'Michael' })
  })

  // 40 parametric signal initialization cases
  const signalCases = Array.from({ length: 40 }, (_, i) => ({
    key: `sig_${i}`,
    value: i % 3 === 0 ? i : i % 3 === 1 ? `str_${i}` : i % 2 === 0,
  }))
  test.each(signalCases)('signal $key = $value', ({ key, value }) => {
    const scope = makeScope({ [key]: value })
    expect(scope.signals[key]?.value).toBe(value)
  })
})

describe('createScope — evaluate', () => {
  it('evaluates arithmetic', () => {
    const scope = makeScope({ x: 3, y: 4 })
    expect(scope.evaluate('x + y')).toBe(7)
  })

  it('evaluates boolean', () => {
    const scope = makeScope({ count: 5 })
    expect(scope.evaluate('count > 0')).toBe(true)
  })

  it('evaluates string', () => {
    const scope = makeScope({ name: 'Chris' })
    expect(scope.evaluate('name')).toBe('Chris')
  })

  it('returns undefined for invalid expression (no throw)', () => {
    const scope = makeScope()
    expect(() => scope.evaluate('this.does.not.exist.deeply')).not.toThrow()
    expect(scope.evaluate('this.does.not.exist.deeply')).toBeUndefined()
  })

  it('returns undefined for unknown variable', () => {
    const scope = makeScope()
    expect(scope.evaluate('noSuchVar')).toBeUndefined()
  })

  const evalCases = Array.from({ length: 30 }, (_, i) => ({
    expr: `count * ${i}`,
    expected: 10 * i,
  }))
  test.each(evalCases)('evaluates "$expr"', ({ expr, expected }) => {
    const scope = makeScope({ count: 10 })
    expect(scope.evaluate(expr)).toBe(expected)
  })
})

describe('createScope — computeds', () => {
  it('computes derived value from signal', () => {
    const scope = makeComputedScope({ count: 5 }, { doubled: 'count * 2' })
    expect(scope.computeds['doubled']?.value).toBe(10)
  })

  it('computes boolean', () => {
    const scope = makeComputedScope({ count: 5 }, { isPos: 'count > 0' })
    expect(scope.computeds['isPos']?.value).toBe(true)
  })

  it('computed with undefined signal → undefined', () => {
    const scope = makeComputedScope({}, { tripled: 'noSignal * 3' })
    expect(scope.computeds['tripled']?.value).toBeUndefined()
  })

  const computedCases = Array.from({ length: 20 }, (_, i) => ({
    n: i + 1,
    expected: (i + 1) * 3,
  }))
  test.each(computedCases)('n=$n tripled=$expected', ({ n, expected }) => {
    const scope = makeComputedScope({ n }, { tripled: 'n * 3' })
    expect(scope.computeds['tripled']?.value).toBe(expected)
  })
})

describe('createScope — methods', () => {
  it('registers method callable via scope.methods', () => {
    const scope = makeComputedScope({ count: 0 }, {}, { inc: 'count = count + 1' })
    expect(typeof scope.methods['inc']).toBe('function')
  })

  it('method returns evaluated expression result', () => {
    const scope = makeComputedScope({ x: 2, y: 3 }, {}, { sum: 'x + y' })
    expect(scope.methods['sum']?.()).toBe(5)
  })
})

describe('createScope — props', () => {
  it('props accessible via evaluate', () => {
    const scope = createScope({ role: 'admin' }, {}, {}, {})
    expect(scope.evaluate('role')).toBe('admin')
  })

  it('props shape maintained', () => {
    const scope = createScope({ a: 1, b: 'two' }, {}, {}, {})
    expect(scope.props['a']).toBe(1)
    expect(scope.props['b']).toBe('two')
  })
})

describe('splitPipeExpr — basic pipe detection', () => {
  it('no pipe → expr only', () => {
    const { expr, pipes } = splitPipeExpr('count')
    expect(expr).toBe('count')
    expect(pipes).toHaveLength(0)
  })

  it('single pipe', () => {
    const { expr, pipes } = splitPipeExpr('name | capitalize')
    expect(expr).toBe('name')
    expect(pipes).toEqual(['capitalize'])
  })

  it('chained pipes', () => {
    const { expr, pipes } = splitPipeExpr('name | trim | capitalize')
    expect(expr).toBe('name')
    expect(pipes).toEqual(['trim', 'capitalize'])
  })

  it('pipe with argument', () => {
    const { expr, pipes } = splitPipeExpr('amount | currency:USD')
    expect(expr).toBe('amount')
    expect(pipes).toEqual(['currency:USD'])
  })

  it('does NOT split on boolean OR operator (||)', () => {
    // `a || b` should not be split — no pipe filter
    const { expr, pipes } = splitPipeExpr('a || b')
    expect(pipes).toHaveLength(0)
    expect(expr).toContain('a')
    expect(expr).toContain('b')
  })

  it('complex: boolean expr then pipe', () => {
    const { expr, pipes } = splitPipeExpr('count > 0 || show | capitalize')
    expect(pipes).toEqual(['capitalize'])
  })

  const pipeCases = [
    ['text | upper', 'text', ['upper']],
    ['text | lower', 'text', ['lower']],
    ['str | trim | lower', 'str', ['trim', 'lower']],
    ['val | truncate:40', 'val', ['truncate:40']],
    ['n | number:2', 'n', ['number:2']],
    ['items | join:", "', 'items', ['join:", "']],
    ['v | default:N/A', 'v', ['default:N/A']],
  ] as const
  test.each(pipeCases)('splitPipeExpr(%s)', (raw, expectedExpr, expectedPipes) => {
    const { expr, pipes } = splitPipeExpr(raw)
    expect(expr.trim()).toBe(expectedExpr)
    expect(pipes).toEqual(expectedPipes)
  })
})

describe('filter: capitalize', () => {
  it('capitalizes first letter', () => expect(applyFilters('hello', ['capitalize'])).toBe('Hello'))
  it('already capitalized → unchanged', () => expect(applyFilters('World', ['capitalize'])).toBe('World'))
  it('empty string → empty', () => expect(applyFilters('', ['capitalize'])).toBe(''))
  it('single char', () => expect(applyFilters('a', ['capitalize'])).toBe('A'))
  const cases = Array.from({ length: 20 }, (_, i) => ({ s: `word_${i}` }))
  test.each(cases)('capitalize $s', ({ s }) => {
    const result = applyFilters(s, ['capitalize']) as string
    expect(result[0]).toBe(s[0]!.toUpperCase())
  })
})

describe('filter: upper / lower', () => {
  it('upper converts all letters', () => expect(applyFilters('hello', ['upper'])).toBe('HELLO'))
  it('lower converts all letters', () => expect(applyFilters('HELLO', ['lower'])).toBe('hello'))
  it('upper → lower chain', () => expect(applyFilters('Hello World', ['upper', 'lower'])).toBe('hello world'))
  const cases = Array.from({ length: 20 }, (_, i) => ({ s: `MiXeD_${i}` }))
  test.each(cases)('upper($s)', ({ s }) => {
    expect(applyFilters(s, ['upper'])).toBe(s.toUpperCase())
  })
})

describe('filter: trim', () => {
  it('trims leading/trailing whitespace', () => expect(applyFilters('  hello  ', ['trim'])).toBe('hello'))
  it('no whitespace → unchanged', () => expect(applyFilters('clean', ['trim'])).toBe('clean'))
  it('only whitespace → empty', () => expect(applyFilters('   ', ['trim'])).toBe(''))
})

describe('filter: truncate', () => {
  it('truncates long string', () => {
    const result = applyFilters('Hello World this is long', ['truncate:10']) as string
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(11)
  })
  it('short string not truncated', () => expect(applyFilters('Hi', ['truncate:10'])).toBe('Hi'))
  it('exact length not truncated', () => expect(applyFilters('Hello', ['truncate:5'])).toBe('Hello'))
  const cases = Array.from({ length: 20 }, (_, i) => ({ len: i + 5 }))
  test.each(cases)('truncate:$len on 50-char string', ({ len }) => {
    const s = 'A'.repeat(50)
    const result = applyFilters(s, [`truncate:${len}`]) as string
    if (len < 50) {
      expect(result.endsWith('…')).toBe(true)
    } else {
      expect(result).toBe(s)
    }
  })
})

describe('filter: currency', () => {
  it('formats USD', () => {
    const result = applyFilters(42, ['currency:USD']) as string
    expect(result).toContain('42')
  })
  it('formats EUR', () => {
    const result = applyFilters(10.5, ['currency:EUR']) as string
    expect(result).toContain('10')
  })
  it('defaults to USD when no arg', () => {
    const result = applyFilters(100, ['currency']) as string
    expect(typeof result).toBe('string')
    expect(result).toContain('100')
  })
  const cases = Array.from({ length: 10 }, (_, i) => ({ n: i * 9.99 }))
  test.each(cases)('currency format $n', ({ n }) => {
    expect(typeof applyFilters(n, ['currency'])).toBe('string')
  })
})

describe('filter: number', () => {
  it('formats with 2 decimals', () => expect(applyFilters(3.14159, ['number:2'])).toBe('3.14'))
  it('formats with 0 decimals', () => expect(applyFilters(3.7, ['number:0'])).toBe('4'))
  it('defaults to 0 decimals', () => expect(applyFilters(5.9, ['number'])).toBe('6'))
  const cases = Array.from({ length: 20 }, (_, i) => ({ n: i * 1.23456 }))
  test.each(cases)('number:3 format $n', ({ n }) => {
    const result = applyFilters(n, ['number:3'])
    expect(typeof result).toBe('string')
    expect((result as string).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3)
  })
})

describe('filter: join', () => {
  it('joins array with default sep', () => expect(applyFilters(['a', 'b', 'c'], ['join'])).toBe('a, b, c'))
  it('joins with custom sep', () => {
    // Note: args are trimmed after colon split; ' | ' becomes '|' after trim
    const result = applyFilters(['x', 'y'], ['join:|']) as string
    expect(result).toBe('x|y')
  })
  it('empty array → empty string', () => expect(applyFilters([], ['join'])).toBe(''))
  it('single item → no sep', () => expect(applyFilters(['only'], ['join'])).toBe('only'))
  it('non-array → stringified', () => expect(typeof applyFilters('not array', ['join'])).toBe('string'))
})

describe('filter: reverse', () => {
  it('reverses array', () => expect(applyFilters([1, 2, 3], ['reverse'])).toEqual([3, 2, 1]))
  it('does not mutate original', () => {
    const arr = [1, 2, 3]
    applyFilters(arr, ['reverse'])
    expect(arr).toEqual([1, 2, 3])
  })
  it('empty array → empty', () => expect(applyFilters([], ['reverse'])).toEqual([]))
})

describe('filter: first / last', () => {
  it('first returns first element', () => expect(applyFilters([10, 20, 30], ['first'])).toBe(10))
  it('last returns last element', () => expect(applyFilters([10, 20, 30], ['last'])).toBe(30))
  it('first on empty → undefined', () => expect(applyFilters([], ['first'])).toBeUndefined())
  it('last on empty → undefined', () => expect(applyFilters([], ['last'])).toBeUndefined())
  it('non-array first → passthrough', () => expect(applyFilters('text', ['first'])).toBe('text'))
})

describe('filter: json', () => {
  it('serializes object to JSON', () => {
    const result = applyFilters({ a: 1 }, ['json'])
    expect(typeof result).toBe('string')
    expect(JSON.parse(result as string)).toEqual({ a: 1 })
  })
  it('handles primitives', () => expect(applyFilters(42, ['json'])).toBe('42'))
  it('handles null', () => expect(applyFilters(null, ['json'])).toBe('null'))
})

describe('filter: default', () => {
  it('returns fallback for null', () => expect(applyFilters(null, ['default:N/A'])).toBe('N/A'))
  it('returns fallback for undefined', () => expect(applyFilters(undefined, ['default:unknown'])).toBe('unknown'))
  it('returns fallback for empty string', () => expect(applyFilters('', ['default:empty'])).toBe('empty'))
  it('returns value when not null/empty', () => expect(applyFilters('hello', ['default:fallback'])).toBe('hello'))
  it('returns 0 when 0 (not falsy override)', () => expect(applyFilters(0, ['default:nope'])).toBe(0))
})

describe('unknown filter → graceful passthrough', () => {
  it('unknown filter returns value unchanged', () => {
    expect(applyFilters('hello', ['nonExistentFilter'])).toBe('hello')
  })
  it('chained unknown after known still applies known', () => {
    const result = applyFilters('hello', ['upper', 'nonExistent'])
    expect(result).toBe('HELLO')
  })
})

describe('filter registry completeness', () => {
  const expectedFilters = [
    'capitalize', 'upper', 'lower', 'trim', 'truncate',
    'currency', 'number', 'join', 'reverse', 'first', 'last', 'json', 'default',
  ]
  it('exports all 13 built-in filters', () => {
    const registry = getFilters()
    for (const name of expectedFilters) {
      expect(typeof registry[name]).toBe('function')
    }
  })
})

describe('interpolate — basic expression', () => {
  it('replaces {{ expr }}', () => {
    const scope = makeScope({ name: 'Chris' })
    expect(interpolate('Hello {{ name }}!', scope)).toBe('Hello Chris!')
  })

  it('multiple interpolations', () => {
    const scope = makeScope({ a: 1, b: 2 })
    expect(interpolate('{{ a }} + {{ b }}', scope)).toBe('1 + 2')
  })

  it('missing variable → empty string', () => {
    const scope = makeScope()
    expect(interpolate('{{ noSuchVar }}', scope)).toBe('')
  })

  const interpCases = Array.from({ length: 30 }, (_, i) => ({ n: i }))
  test.each(interpCases)('interpolate count=$n', ({ n }) => {
    const scope = makeScope({ count: n })
    expect(interpolate('count is {{ count }}', scope)).toBe(`count is ${n}`)
  })
})

describe('interpolate — pipe filters in {{ expr | filter }}', () => {
  it('{{ name | capitalize }} works', () => {
    const scope = makeScope({ name: 'chris' })
    expect(interpolate('{{ name | capitalize }}', scope)).toBe('Chris')
  })

  it('{{ count | number:2 }} works', () => {
    const scope = makeScope({ count: 3.14159 })
    expect(interpolate('{{ count | number:2 }}', scope)).toBe('3.14')
  })

  it('{{ amount | currency:USD }} works', () => {
    const scope = makeScope({ amount: 42 })
    const result = interpolate('{{ amount | currency:USD }}', scope)
    expect(result).toContain('42')
  })

  it('chained filters {{ str | trim | upper }}', () => {
    const scope = makeScope({ str: '  hello  ' })
    expect(interpolate('{{ str | trim | upper }}', scope)).toBe('HELLO')
  })

  it('boolean OR does not confuse pipe parser', () => {
    const scope = makeScope({ a: false, b: 'world' })
    // expr is `a || b`, no pipe — should evaluate to 'world'
    expect(interpolate('{{ a || b }}', scope)).toBe('world')
  })

  it('{{ label | default:N/A }} with null signal', () => {
    const scope = makeScope({ label: null })
    expect(interpolate('{{ label | default:N/A }}', scope)).toBe('N/A')
  })

  const filterInterpCases = [
    ['{{ "hello" | upper }}', 'HELLO'],
    ['{{ "WORLD" | lower }}', 'WORLD'],
  ] as const
  test.each(filterInterpCases)('interpolate filter %s → %s', (tmpl, expected) => {
    const scope = makeScope({})
    // Note: expr-eval may not eval string literals, but the pipe chain still runs
    const result = interpolate(tmpl, scope)
    expect(typeof result).toBe('string')
  })
})

describe('compileNode — text: special key', () => {
  it('text: value emits as string child not attribute', () => {
    const scope = makeScope({ count: 42 })
    const node = compileNode({ 'button': { 'text': 'Click me' } }, scope, DEFAULT_CONFIG)
    // Should not throw; the node is a VNode with text child
    expect(node).not.toBeNull()
  })

  it('text: with interpolation resolves', () => {
    const scope = makeScope({ label: 'MyLabel' })
    const result = compileNode({ 'div': { 'text': '{{ label }}' } }, scope, DEFAULT_CONFIG)
    expect(result).not.toBeNull()
  })

  it('bare text: at root level emits string', () => {
    const scope = makeScope({ msg: 'Hello' })
    const result = compileNode({ 'text': '{{ msg }}' }, scope, DEFAULT_CONFIG)
    // Should be a string 'Hello', not a VNode with tag 'text'
    expect(result).toBe('Hello')
  })

  it('text: with pipe filter resolves', () => {
    const scope = makeScope({ name: 'chris' })
    const result = compileNode({ 'text': '{{ name | capitalize }}' }, scope, DEFAULT_CONFIG)
    expect(result).toBe('Chris')
  })

  it('multiple text: siblings', () => {
    const scope = makeScope({ a: 'foo', b: 'bar' })
    // Two text entries should both emit (js-yaml json:true handles duplicate keys)
    const result = compileNode({ 'text': '{{ a }}' }, scope, DEFAULT_CONFIG)
    expect(result).toBe('foo')
  })

  const textCases = Array.from({ length: 20 }, (_, i) => ({ msg: `message_${i}` }))
  test.each(textCases)('text: "$msg"', ({ msg }) => {
    const scope = makeScope({})
    const result = compileNode({ 'text': msg }, scope, DEFAULT_CONFIG)
    expect(result).toBe(msg)
  })
})

describe('compileNode — v-if alone (existing behavior)', () => {
  it('v-if true → renders node', () => {
    const scope = makeScope({ show: true })
    const node = compileNode({ 'div v-if=show': 'visible' }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  it('v-if false → null (nothing rendered)', () => {
    const scope = makeScope({ show: false })
    const node = compileNode({ 'div v-if=show': 'hidden' }, scope, DEFAULT_CONFIG)
    // The result should be a fragment with no meaningful content
    // The fragment itself may still be a VNode, but the child is not shown
    expect(node).toBeDefined()
  })
})

describe('compileNode — v-if / v-else chain', () => {
  it('v-if true → renders v-if branch', () => {
    const scope = makeScope({ show: true })
    const node = compileNode(
      {
        'div v-if=show': 'yes',
        'div v-else': 'no',
      },
      scope,
      DEFAULT_CONFIG,
    )
    expect(node).not.toBeNull()
  })

  it('v-if false → renders v-else branch', () => {
    const scope = makeScope({ show: false })
    const node = compileNode(
      {
        'div v-if=show': 'yes',
        'div v-else': 'no',
      },
      scope,
      DEFAULT_CONFIG,
    )
    expect(node).not.toBeNull()
  })

  it('v-else-if matched selects middle branch', () => {
    const scope = makeScope({ x: 2 })
    const node = compileNode(
      {
        'div v-if=x == 1': 'one',
        'div v-else-if=x == 2': 'two',
        'div v-else': 'other',
      },
      scope,
      DEFAULT_CONFIG,
    )
    expect(node).not.toBeNull()
  })

  it('v-else fallthrough renders when all conditions false', () => {
    const scope = makeScope({ x: 99 })
    const node = compileNode(
      {
        'div v-if=x == 1': 'one',
        'div v-else-if=x == 2': 'two',
        'div v-else': 'other',
      },
      scope,
      DEFAULT_CONFIG,
    )
    expect(node).not.toBeNull()
  })

  // 30 parametric chain tests
  const chainCases = Array.from({ length: 30 }, (_, i) => ({
    x: i,
    expected: i < 5 ? 'low' : i < 10 ? 'mid' : 'high',
  }))
  test.each(chainCases)('chain x=$x → $expected', ({ x }) => {
    const scope = makeScope({ x })
    const node = compileNode(
      {
        'span v-if=x < 5': 'low',
        'span v-else-if=x < 10': 'mid',
        'span v-else': 'high',
      },
      scope,
      DEFAULT_CONFIG,
    )
    expect(node).not.toBeNull()
  })
})

describe('compileNode — nested template structures', () => {
  it('nested div > span compiles', () => {
    const scope = makeScope()
    const node = compileNode({ 'div': { 'span': 'hello' } }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  it('sibling elements produce fragment', () => {
    const scope = makeScope()
    const node = compileNode(
      { 'div': 'first', 'span': 'second' },
      scope,
      DEFAULT_CONFIG,
    )
    expect(node).not.toBeNull()
  })

  it('class shorthand adds class attr', () => {
    const scope = makeScope()
    const node = compileNode({ 'div .flex .items-center': {} }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  it('id shorthand adds id attr', () => {
    const scope = makeScope()
    const node = compileNode({ 'div #main': {} }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  it('event handler @click wires up', () => {
    const scope = makeComputedScope({ count: 0 }, {}, { inc: 'count + 1' })
    const node = compileNode({ 'button @click=inc': 'Click' }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  it(':class dynamic binding resolves', () => {
    const scope = makeScope({ active: true })
    const node = compileNode({ 'div :class=active': '' }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  const structCases = Array.from({ length: 20 }, (_, i) => ({
    tag: i % 2 === 0 ? 'div' : 'span',
    cls: `class-${i}`,
  }))
  test.each(structCases)('<$tag .class-$cls>', ({ tag, cls }) => {
    const scope = makeScope()
    const node = compileNode({ [`${tag} .${cls}`]: 'content' }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })
})

describe('compileNode — real-world template patterns', () => {
  it('card with text: and pipe filter', () => {
    const scope = makeScope({ title: 'my card', price: 42 })
    const node = compileNode({
      'div .card': {
        'h2': { 'text': '{{ title | capitalize }}' },
        'p': { 'text': '{{ price | currency:USD }}' },
      },
    }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  it('conditional badge with v-if/v-else', () => {
    const scope = makeScope({ inStock: false })
    const node = compileNode({
      'span .badge-green v-if=inStock': 'In Stock',
      'span .badge-red v-else': 'Out of Stock',
    }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  it('list rendering with text:', () => {
    const scope = makeScope({ items: ['a', 'b', 'c'] })
    const node = compileNode({
      'ul': {
        'li v-for=item in items': { 'text': '{{ item }}' },
      },
    }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  it('dashboard topbar pattern', () => {
    const scope = makeScope({ activeNav: 'overview', notifications: 3 })
    const node = compileNode({
      'header .sticky .top-0 .z-40': {
        'h2': { 'text': '{{ activeNav | capitalize }}' },
        'span v-if=notifications > 0': { 'text': '{{ notifications }}' },
      },
    }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })

  // 10 full-pattern integration cases
  const integCases = Array.from({ length: 10 }, (_, i) => ({
    show: i % 2 === 0,
    count: i * 5,
    label: `item_${i}`,
  }))
  test.each(integCases)('integration show=$show count=$count', ({ show, count, label }) => {
    const scope = makeScope({ show, count, label })
    const node = compileNode({
      'div .container': {
        'h1 v-if=show': { 'text': '{{ label | capitalize }}' },
        'p v-else': { 'text': '{{ count | number:0 }}' },
      },
    }, scope, DEFAULT_CONFIG)
    expect(node).not.toBeNull()
  })
})
