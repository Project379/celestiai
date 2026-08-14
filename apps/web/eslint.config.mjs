import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import pkg from '../../packages/config/eslint/no-new-bg-strings.cjs'

const { NO_NEW_BG_STRINGS_RULE, CONTENT_HOME_GLOBS, TEST_IGNORE_GLOBS } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: ['.next/**', 'node_modules/**', '.turbo/**', 'public/**'],
  },
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: TEST_IGNORE_GLOBS,
    rules: NO_NEW_BG_STRINGS_RULE,
  },
  {
    files: CONTENT_HOME_GLOBS,
    rules: { 'no-restricted-syntax': 'off' },
  },
]
