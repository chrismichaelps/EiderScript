import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      'eiderscript': path.resolve(__dirname, '../src/index.ts'),
      'vue': 'vue/dist/vue.esm-bundler.js'
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
