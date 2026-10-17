import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', '**/dist/**', 'node_modules/**', '**/node_modules/**', '**/*.cjs'],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
]
