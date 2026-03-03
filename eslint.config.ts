// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.turbo/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
    ],
  },

  // Base ESLint for all JS/TS
  eslint.configs.recommended,

  // TypeScript strict preset
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Vue SFC support (future)
  ...pluginVue.configs['flat/recommended'],

  // Project-wide TS parser options
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // TypeScript overrides
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Enforce type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // No any — use unknown
      '@typescript-eslint/no-explicit-any': 'error',
      // No non-null assertion
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Require explicit return types on module-boundary functions
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Allow void returns in callbacks
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true },
      ],
      // Restrict template expressions to safe types
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      // No floating promises
      '@typescript-eslint/no-floating-promises': 'error',
      // No misused promises
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // Vue overrides
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)
