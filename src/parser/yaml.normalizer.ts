/** @EiderScript.Parser.YamlNormalizer — Pre-processes .eider.yaml before js-yaml parsing.
 *
 * EiderScript templates allow long key strings split across lines:
 *   div .flex .items-center .dark:bg-gray-900
 *     .hover:shadow-xl .transition-all .duration-300:
 *       child: value
 *
 * Standard YAML forbids implicit block-mapping keys spanning multiple lines.
 * This normalizer joins such continuation lines into a single key before parsing,
 * so authors write readable multi-line class lists without needing quotes.
 *
 * Joining rules
 * We look for "template key" lines — lines that:
 *   1. Start with an HTML tag or `.class` / `#id` shorthand
 *   2. Do NOT end with `:` (incomplete key)
 *   3. Are NOT a YAML sequence item (`- `)
 *   4. Do NOT already contain an inline scalar value
 *
 * Multiple more-indented continuation lines starting with `.`, `#`, or `!`
 * are joined into the key until:
 *   - A continuation line ends with `:` (key now complete, value on next line)
 *   - A continuation line is the "final" part containing `: <value>` (key + inline value)
 *   - The next line is no longer more-indented or not a class-shorthand token
 */

const HTML_TAGS = new Set([
  'div', 'span', 'p', 'a', 'button', 'input', 'textarea', 'select', 'option',
  'form', 'label', 'img', 'video', 'audio', 'canvas', 'svg',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'header', 'footer', 'main', 'nav', 'section', 'article', 'aside',
  'figure', 'figcaption', 'blockquote', 'pre', 'code',
  'slot', 'template', 'script', 'style',
])

/** True if a trimmed line is or starts with an EiderScript template key token. */
function isTemplateKeyStart(trimmed: string): boolean {
  if (trimmed.startsWith('.') || trimmed.startsWith('#')) return true
  const firstWord = trimmed.split(/\s+/)[0] ?? ''
  return HTML_TAGS.has(firstWord) || /^[A-Z][a-zA-Z0-9]*$/.test(firstWord)
}

/** True when a trimmed line ends with `:` as a YAML block key terminator.
 *  Tailwind classes (`dark:bg-gray-900`) end with alphanumeric chars, not `:`. */
function isYamlKeyEnd(trimmed: string): boolean {
  return trimmed.endsWith(':')
}

/** True when a line has an inline YAML scalar value.
 *  Pattern: key ends with `: ` followed by some value (string, number, quoted, etc.)
 *  We detect `': '` (colon-space) explicitly, which is NOT present in Tailwind
 *  variant tokens like `dark:bg-gray-900` (no space after variant colon). */
function hasInlineValue(trimmed: string): boolean {
  return /:\s+\S/.test(trimmed)
}

/** True when a continuation line's first token marks it as a class-list continuation.
 *  Only `.class`, `#id`, and `!important` tokens are valid continuations.
 *  Plain words (YAML keys, values) are NOT. */
function isContinuationFirst(token: string): boolean {
  return token.startsWith('.') || token.startsWith('#') || token.startsWith('!')
}

/**
 * @EiderScript.Parser.YamlNormalizer — normalizeYaml(source)
 *
 * Joins multi-line template key lines into single lines before js-yaml parsing.
 * All other YAML constructs (scalars, sequences, inline values) are emitted unchanged.
 */
export function normalizeYaml(source: string): string {
  const lines = source.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const trimEnd = line.trimEnd()
    const trimmed = line.trimStart()
    const indent = line.length - trimmed.length

    // Empty lines and comments → emit unchanged
    if (!trimmed || trimmed.startsWith('#')) {
      out.push(line)
      i++
      continue
    }

    // YAML sequence items (`- …`, `- `) → emit unchanged (never join)
    if (trimmed.startsWith('- ') || trimmed === '-') {
      out.push(line)
      i++
      continue
    }

    // Lines with inline YAML scalar values (key: value) → emit unchanged
    // (e.g. `name: Counter`, `path: /`, but NOT bare `dark:bg-gray-900`)
    if (hasInlineValue(trimmed)) {
      out.push(line)
      i++
      continue
    }

    // Lines already ending with `:` (complete YAML key) → emit unchanged
    if (isYamlKeyEnd(trimmed)) {
      out.push(line)
      i++
      continue
    }

    // Multi-line key joining
    // Only attempt for template keys (HTML tags or `.class/#id` starts)
    if (isTemplateKeyStart(trimmed)) {
      let joined = trimEnd
      let j = i + 1
      let done = false

      while (j < lines.length && !done) {
        const nextRaw = lines[j] ?? ''
        const nextTrimmed = nextRaw.trimStart()
        const nextIndent = nextRaw.length - nextTrimmed.length

        // Continuation must be strictly more-indented
        if (nextIndent <= indent || !nextTrimmed) break

        // Continuation line's first token must be a class shorthand
        const firstToken = nextTrimmed.split(/\s+/)[0] ?? ''
        if (!isContinuationFirst(firstToken)) break

        // Join this line (may be the terminal: ends with `:` or has inline value)
        joined = joined.trimEnd() + ' ' + nextTrimmed.trimEnd()
        j++

        // Stop: key is complete
        if (isYamlKeyEnd(joined.trimEnd())) { done = true; break }

        // Stop: the joined line now contains an inline value (the value is part of the key line)
        // Example: `span .rounded-full .bg-white .shadow-lg .ring-0 .transition: ""`
        if (hasInlineValue(joined)) { done = true; break }
      }

      if (j > i + 1) {
        out.push(' '.repeat(indent) + joined.trimStart())
        i = j
        continue
      }
    }

    // Fallthrough: emit unchanged
    out.push(line)
    i++
  }

  return out.join('\n')
}
