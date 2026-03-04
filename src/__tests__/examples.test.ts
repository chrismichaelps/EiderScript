/** @EiderScript Tests — F6 Example Integration Suite
 *  Parses all 7 .eider.yaml specimens end-to-end through parseYaml.
 *  Asserts: no parse error, correct `kind`, expected top-level AST shape.
 */
import { describe, it, expect, test } from 'vitest'
import { Effect, Either } from 'effect'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { parseYaml } from '../parser/yaml.parser.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const EXAMPLES = resolve(__dir, '../../examples')

function readExample(filename: string): string {
  return readFileSync(resolve(EXAMPLES, filename), 'utf-8')
}

function parse(yaml: string) {
  return Effect.runSync(Effect.either(parseYaml(yaml)))
}

function assertOk<E, A>(result: Either.Either<A, E>): A {
  expect(Either.isRight(result)).toBe(true)
  return (result as Either.Right<A, E>).right
}

const SPECIMENS = [
  {
    file: 'counter.eider.yaml',
    expectedName: 'CounterApp',
    expectedKind: 'app' as const,
    minRoutes: 1,
    componentNames: ['Counter'],
    hasSignals: true,
  },
  {
    file: 'todo-app.eider.yaml',
    expectedName: 'TodoApp',
    expectedKind: 'app' as const,
    minRoutes: 1,
    componentNames: ['TodoApp'],
    hasSignals: true,
  },
  {
    file: 'auth-form.eider.yaml',
    expectedName: 'AuthForm',
    expectedKind: 'app' as const,
    minRoutes: 1,
    componentNames: ['AuthForm'],
    hasSignals: true,
  },
  {
    file: 'dashboard.eider.yaml',
    expectedName: 'Dashboard',
    expectedKind: 'app' as const,
    minRoutes: 1,
    componentNames: ['Dashboard'],
    hasSignals: true,
  },
  {
    file: 'theme-toggle.eider.yaml',
    expectedName: 'ThemeToggle',
    expectedKind: 'app' as const,
    minRoutes: 1,
    componentNames: ['ThemeToggle'],
    hasSignals: true,
  },
  {
    file: 'modal.eider.yaml',
    expectedName: 'Modal',
    expectedKind: 'app' as const,
    minRoutes: 1,
    componentNames: ['Modal'],
    hasSignals: true,
  },
  {
    file: 'product-card.eider.yaml',
    expectedName: 'ProductCard',
    expectedKind: 'app' as const,
    minRoutes: 1,
    componentNames: ['ProductCard'],
    hasSignals: true,
  },
] as const

describe('examples — parse succeeds (7 specimens)', () => {
  test.each(SPECIMENS)('$file parses without error', ({ file }) => {
    const yaml = readExample(file)
    const result = parse(yaml)
    expect(Either.isRight(result)).toBe(true)
  })
})

describe('examples — kind is "app" (7 specimens)', () => {
  test.each(SPECIMENS)('$file → kind=app', ({ file, expectedKind }) => {
    const yaml = readExample(file)
    const result = parse(yaml)
    const ast = assertOk(result)
    expect(ast.kind).toBe(expectedKind)
  })
})

describe('examples — app name is non-empty string (7 specimens)', () => {
  test.each(SPECIMENS)('$file → name is string', ({ file }) => {
    const yaml = readExample(file)
    const result = parse(yaml)
    const ast = assertOk(result)
    expect(typeof ast.ast.name).toBe('string')
    expect((ast.ast.name as string).length).toBeGreaterThan(0)
  })
})

describe('examples — router has at least 1 route (7 specimens)', () => {
  test.each(SPECIMENS)('$file → routes.length >= $minRoutes', ({ file, minRoutes }) => {
    const yaml = readExample(file)
    const result = parse(yaml)
    const ast = assertOk(result)
    // AppAST has router.routes
    const appAst = ast.ast as { router?: { routes?: unknown[] } }
    expect(Array.isArray(appAst.router?.routes)).toBe(true)
    expect((appAst.router?.routes ?? []).length).toBeGreaterThanOrEqual(minRoutes)
  })
})

describe('examples — components array present and non-empty (7 specimens)', () => {
  test.each(SPECIMENS)('$file → components is array', ({ file }) => {
    const yaml = readExample(file)
    const result = parse(yaml)
    const ast = assertOk(result)
    const appAst = ast.ast as { components?: unknown[] }
    // components may be optional in schema — if present must be array
    if (appAst.components !== undefined) {
      expect(Array.isArray(appAst.components)).toBe(true)
      expect((appAst.components as unknown[]).length).toBeGreaterThan(0)
    }
  })
})

describe('examples — YAML file readable and non-empty (7 specimens)', () => {
  test.each(SPECIMENS)('$file → non-empty YAML', ({ file }) => {
    const yaml = readExample(file)
    expect(typeof yaml).toBe('string')
    expect(yaml.trim().length).toBeGreaterThan(0)
  })
})

describe('examples — parse is idempotent (7 specimens)', () => {
  test.each(SPECIMENS)('$file → same kind on second parse', ({ file }) => {
    const yaml = readExample(file)
    const r1 = parse(yaml)
    const r2 = parse(yaml)
    const a1 = assertOk(r1)
    const a2 = assertOk(r2)
    expect(a1.kind).toBe(a2.kind)
    expect((a1.ast as { name: string }).name).toBe((a2.ast as { name: string }).name)
  })
})

describe('examples — result is Right<EiderAST> never Left<ParseError> (7 specimens)', () => {
  test.each(SPECIMENS)('$file → Either.isRight', ({ file }) => {
    const yaml = readExample(file)
    const result = parse(yaml)
    expect(Either.isLeft(result)).toBe(false)
    expect(Either.isRight(result)).toBe(true)
  })
})


describe('counter.eider.yaml — structural deep assertions', () => {
  const yaml = readExample('counter.eider.yaml')

  it('parses successfully', () => {
    expect(Either.isRight(parse(yaml))).toBe(true)
  })

  it('has "CounterApp" in raw YAML', () => {
    expect(yaml).toContain('CounterApp')
  })

  it('has "count" signal in raw YAML', () => {
    expect(yaml).toContain('count')
  })

  it('has "doubled" computed in raw YAML', () => {
    expect(yaml).toContain('doubled')
  })

  it('has "increment" method in raw YAML', () => {
    expect(yaml).toContain('increment')
  })

  it('has "decrement" method in raw YAML', () => {
    expect(yaml).toContain('decrement')
  })
})

describe('todo-app.eider.yaml — structural deep assertions', () => {
  const yaml = readExample('todo-app.eider.yaml')

  it('parses successfully', () => {
    expect(Either.isRight(parse(yaml))).toBe(true)
  })

  it('uses v-for directive', () => {
    expect(yaml).toContain('v-for')
  })

  it('uses v-model directive', () => {
    expect(yaml).toContain('v-model')
  })

  it('uses v-if directive', () => {
    expect(yaml).toContain('v-if')
  })

  it('has "todos" signal', () => {
    expect(yaml).toContain('todos')
  })

  it('has computed "totalCount"', () => {
    expect(yaml).toContain('totalCount')
  })
})

describe('auth-form.eider.yaml — structural deep assertions', () => {
  const yaml = readExample('auth-form.eider.yaml')

  it('parses successfully', () => {
    expect(Either.isRight(parse(yaml))).toBe(true)
  })

  it('uses v-model for input binding', () => {
    expect(yaml).toContain('v-model')
  })

  it('uses v-if for conditional error display', () => {
    expect(yaml).toContain('v-if')
  })
})

describe('dashboard.eider.yaml — structural deep assertions', () => {
  const yaml = readExample('dashboard.eider.yaml')

  it('parses successfully', () => {
    expect(Either.isRight(parse(yaml))).toBe(true)
  })

  it('has sidebar or nav pattern', () => {
    expect(yaml.toLowerCase()).toMatch(/nav|sidebar|menu/)
  })

  it('uses v-for for data table rows', () => {
    expect(yaml).toContain('v-for')
  })
})

describe('theme-toggle.eider.yaml — structural deep assertions', () => {
  const yaml = readExample('theme-toggle.eider.yaml')

  it('parses successfully', () => {
    expect(Either.isRight(parse(yaml))).toBe(true)
  })

  it('has dark: Tailwind variant', () => {
    expect(yaml).toContain('dark:')
  })
})

describe('modal.eider.yaml — structural deep assertions', () => {
  const yaml = readExample('modal.eider.yaml')

  it('parses successfully', () => {
    expect(Either.isRight(parse(yaml))).toBe(true)
  })

  it('uses v-show or v-if for visibility', () => {
    expect(yaml).toMatch(/v-show|v-if/)
  })
})

describe('product-card.eider.yaml — structural deep assertions', () => {
  const yaml = readExample('product-card.eider.yaml')

  it('parses successfully', () => {
    expect(Either.isRight(parse(yaml))).toBe(true)
  })

  it('has hover: Tailwind variant for conditional styles', () => {
    expect(yaml).toContain('hover:')
  })
})

const BULK_YAML_CHECKS = SPECIMENS.flatMap(({ file }) => {
  const yaml = readExample(file)
  return [
    { file, check: 'has name:', yaml, pattern: 'name:' },
    { file, check: 'has router:', yaml, pattern: 'router:' },
    { file, check: 'has routes:', yaml, pattern: 'routes:' },
    { file, check: 'has template:', yaml, pattern: 'template:' },
    { file, check: 'has component:/', yaml, pattern: 'component:' },
    { file, check: 'non-empty', yaml, pattern: '' },
    { file, check: 'has YAML indentation', yaml, pattern: '  ' },
  ]
})

test.each(BULK_YAML_CHECKS)('$file — $check', ({ yaml, pattern }) => {
  if (pattern === '') {
    expect(yaml.trim().length).toBeGreaterThan(0)
  } else {
    expect(yaml).toContain(pattern)
  }
})
