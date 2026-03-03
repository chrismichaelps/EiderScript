import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { eiderPlugin } from './src/vite-plugin/index.js'

export default defineConfig({
  plugins: [eiderPlugin(), vue()],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'EiderScript',
      formats: ['es', 'cjs'],
      fileName: (format) => `eiderscript.${format}.js`,
    },
    rollupOptions: {
      external: [
        'vue',
        'vue-router',
        'pinia',
        'effect',
        'js-yaml',
        'zod',
        'expr-eval',
        '@vue/server-renderer',
      ],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter',
          pinia: 'Pinia',
          effect: 'Effect',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@root': new URL('./', import.meta.url).pathname,
    },
  },
})
