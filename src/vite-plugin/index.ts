/** @EiderScript.Vite.Plugin - Vite plugin to transform .eider.yaml files */
import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { load } from 'js-yaml'
import { normalizeYaml } from '../parser/yaml.normalizer.js'
import { scanTailwindClasses } from '../styles/tailwind.scanner.js'

const EIDER_RE = /\.eider\.yaml$/

/**
 * @EiderScript.Vite.Plugin - eiderPlugin()
 * Transforms .eider.yaml files into importable ES modules at build time.
 * Returns a JSON module with { kind, ast } to be passed to createEiderApp.
 * Also emits a pseudo-comment of discovered Tailwind classes for JIT scanning.
 */
export function eiderPlugin(): Plugin {
  return {
    name: 'vite-plugin-eider',
    enforce: 'pre',

    async transform(code: string, id: string) {
      if (!EIDER_RE.test(id)) return null

      let raw: unknown
      try {
        raw = load(normalizeYaml(code), { json: true })
      } catch (e) {
        this.error(`EiderScript YAML parse error in ${id}: ${String(e)}`)
        return null
      }

      // Extract Tailwind classes for JIT content scanning
      const twClasses = scanTailwindClasses(raw)
      const twComment = twClasses.length > 0
        ? `/* tw:${twClasses.join(' ')} */\n`
        : ''

      const serialized = JSON.stringify(raw)
      return {
        code: `${twComment}export default ${serialized}`,
        map: null,
      }
    },

    async load(id: string) {
      if (!EIDER_RE.test(id)) return null
      try {
        const content = await readFile(id, 'utf-8')
        return { code: content, map: null }
      } catch {
        return null
      }
    },
  }
}
