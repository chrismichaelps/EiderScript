/** @EiderScript.Styles.TailwindScanner - Extracts Tailwind CSS classes from YAML AST */

/**
 * Full-spectrum Tailwind class detector.
 *
 * Handles the complete Tailwind v3/v4 taxonomy:
 *   - Basic utilities           p-4, flex, text-sm, bg-blue-500
 *   - Negative values           -mt-4, -mx-2
 *   - Responsive variants       md:flex, lg:hidden, xl:p-8
 *   - State variants            hover:bg-blue-500, focus:ring-2, disabled:opacity-50
 *   - Dark mode                 dark:text-white, dark:bg-gray-900
 *   - Stacked variants          dark:hover:bg-gray-800, md:hover:text-xl, lg:focus:ring-4
 *   - Group/peer modifiers      group-hover:opacity-100, peer-focus:border-blue-500
 *   - Important modifier        !text-red-500, !p-0, !font-bold
 *   - Fraction values           w-1/2, w-2/3, h-3/4
 *   - Opacity modifier          bg-red-500/50, text-blue-600/75
 *   - Arbitrary values          bg-[#ff0000], text-[14px], w-[320px], grid-cols-[1fr_auto]
 *   - Arbitrary properties      [mask-type:alpha], [color:steelblue]
 *   - Stacked + group           dark:md:hover:text-white, sm:group-hover:bg-blue-500
 *
 * Two alternation branches:
 *   Branch A: [!] [variants:]* [-] base [-segments] [/opacity] [-[arbitrary]]
 *   Branch B: [arbitrary-property:value]  (e.g. [mask-type:alpha])
 */
const TAILWIND_RE =
  /^!?(?:(?:[\w-]+):)*-?[a-z][a-z0-9]*(?:-(?:[a-z0-9]+|\d+\/\d+))*(?:\/\d+)?(?:-\[[^\]]+\])?$|^\[[a-zA-Z-]+:[^\]]+\]$/

function isTailwindClass(token: string): boolean {
  return TAILWIND_RE.test(token)
}

function tokenize(str: string): string[] {
  return str.trim().split(/\s+/).filter(Boolean)
}

function walkAst(node: unknown, collected: Set<string>): void {
  if (node === null || node === undefined) return

  if (typeof node === 'string') {
    for (const token of tokenize(node)) {
      if (isTailwindClass(token)) collected.add(token)
    }
    return
  }

  if (Array.isArray(node)) {
    for (const item of node) walkAst(item, collected)
    return
  }

  if (typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      // EiderScript template keys use ".class" and "#id" shorthand.
      // Strip those prefixes before testing against Tailwind patterns.
      for (const token of tokenize(key)) {
        const normalized =
          token.startsWith('.') || token.startsWith('#') ? token.slice(1) : token
        if (normalized && isTailwindClass(normalized)) collected.add(normalized)
      }
      walkAst(value, collected)
    }
  }
}

/** @EiderScript.Styles.TailwindScanner - Walks AST and returns unique Tailwind class list */
export function scanTailwindClasses(ast: unknown): string[] {
  const collected = new Set<string>()
  try {
    walkAst(ast, collected)
  } catch {
    // Never throws — return whatever we collected before the error
  }
  return Array.from(collected)
}
