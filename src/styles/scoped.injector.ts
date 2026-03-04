/** @EiderScript.Styles.ScopedInjector - Injects scoped <style> tags into document.head */

/** @EiderScript.Styles.ScopedInjector - Deterministic FNV-1a 32-bit hash */
export function generateScopeId(componentName: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < componentName.length; i++) {
    hash ^= componentName.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0 // keep 32-bit unsigned
  }
  return `data-v-${hash.toString(16).padStart(8, '0')}`
}

/** @EiderScript.Styles.ScopedInjector - Scopes CSS rules with attribute selector */
function scopeCSS(css: string, scopeAttr: string): string {
  // Prefix each rule selector with [scopeAttr]
  return css.replace(/([^{}]+)\{/g, (match, selector: string) => {
    const scoped = selector
      .split(',')
      .map((s) => `[${scopeAttr}] ${s.trim()}`)
      .join(', ')
    return `${scoped} {`
  })
}

/** @EiderScript.Styles.ScopedInjector - Idempotent style tag injection */
export function injectScopedStyle(componentName: string, css: string, scoped: boolean): void {
  if (typeof document === 'undefined') return // SSR guard

  const existingTag = document.querySelector(`[data-eider-component="${componentName}"]`)
  if (existingTag) return // Already injected — idempotent

  const styleEl = document.createElement('style')
  styleEl.setAttribute('data-eider-component', componentName)

  if (scoped) {
    const scopeAttr = generateScopeId(componentName)
    styleEl.textContent = scopeCSS(css, scopeAttr)
  } else {
    styleEl.textContent = css
  }

  document.head.appendChild(styleEl)
}
