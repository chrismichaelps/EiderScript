/** @EiderScript.Vite.Plugin - Vite plugin to transform .eider.yaml files */
import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { load } from 'js-yaml'

const EIDER_RE = /\.eider\.yaml$/

/**
 * @EiderScript.Vite.Plugin - eiderPlugin()
 * Transforms .eider.yaml files into importable ES modules at build time.
 * Returns a JSON module with { kind, ast } to be passed to createEiderApp.
 */
export function eiderPlugin(): Plugin {
  return {
    name: 'vite-plugin-eider',
    enforce: 'pre',

    async transform(code: string, id: string) {
      if (!EIDER_RE.test(id)) return null

      let raw: unknown
      try {
        raw = load(code)
      } catch (e) {
        this.error(`EiderScript YAML parse error in ${id}: ${String(e)}`)
        return null
      }

      const serialized = JSON.stringify(raw)
      return {
        code: `export default ${serialized}`,
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
