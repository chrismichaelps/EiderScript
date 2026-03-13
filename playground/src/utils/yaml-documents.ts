/** Multi-document YAML splitting logic */

export type DocumentKind = 'store' | 'app' | 'component' | 'unknown'

export interface SplitYamlResult {
  readonly app: string
  readonly stores: Record<string, string>
  readonly components: Record<string, string>
  readonly isMultiDocument: boolean
}

const DOCUMENT_SEPARATOR = /^---\s*$/m
const YAML_DIRECTIVE = /^%YAML\s+\S+\s*/m
const COMMENT_LINES = /^#.*$/gm

const APP_FIELDS = ['router', 'global', 'components'] as const

const COMPONENT_FIELDS = [
  'template', 'props', 'signals', 'computeds',
  'methods', 'actions', 'watch', 'styles',
  'onMounted', 'onUnmounted', 'onBeforeMount', 'onUpdated',
] as const

const regexCache = new Map<string, RegExp>()

function getOrCreateRegex(key: string, pattern: string): RegExp {
  let re = regexCache.get(key)
  if (!re) {
    re = new RegExp(pattern)
    regexCache.set(key, re)
  }
  return re
}

function hasField(doc: string, field: string): boolean {
  return getOrCreateRegex(`p:${field}`, `(?:^|\\n)\\s*${field}:`).test(doc)
}

function hasAnyField(doc: string, fields: readonly string[]): boolean {
  return fields.some(f => hasField(doc, f))
}

function readFieldValue(doc: string, field: string): string | null {
  const re = getOrCreateRegex(`v:${field}`, `(?:^|\\n)\\s*${field}:\\s+([^\\n]+)`)
  return doc.match(re)?.[1]?.trim() ?? null
}

function hasSubstantiveContent(block: string): boolean {
  return block
    .replace(YAML_DIRECTIVE, '')
    .replace(COMMENT_LINES, '')
    .trim().length > 0
}

function extractDocuments(raw: string): string[] {
  return raw
    .split(DOCUMENT_SEPARATOR)
    .map(block => block.trim())
    .filter(hasSubstantiveContent)
}

function detectKind(doc: string): DocumentKind {
  const hasId = hasField(doc, 'id')
  const hasName = hasField(doc, 'name')

  if (hasId && !hasName) return 'store'
  if (!hasName) return 'unknown'
  if (hasAnyField(doc, APP_FIELDS)) return 'app'
  if (hasAnyField(doc, COMPONENT_FIELDS)) return 'component'

  return 'app'
}

export function splitYamlDocuments(raw: string): SplitYamlResult {
  const documents = extractDocuments(raw)

  let app = ''
  const stores: Record<string, string> = {}
  const components: Record<string, string> = {}

  for (const doc of documents) {
    switch (detectKind(doc)) {
      case 'store': {
        const id = readFieldValue(doc, 'id')
          ?? `store_${Object.keys(stores).length}`
        stores[id] = doc
        break
      }
      case 'component': {
        const name = readFieldValue(doc, 'name')
          ?? `Component${Object.keys(components).length}`
        components[name] = doc
        break
      }
      default:
        if (doc) app = doc
        break
    }
  }

  if (!app && documents.length > 0 && Object.keys(stores).length === 0) {
    app = raw
  }

  return {
    app,
    stores,
    components,
    isMultiDocument: documents.length > 1,
  }
}
