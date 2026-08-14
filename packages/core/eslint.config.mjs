// Framework-coupling denylist per .planning/research/CACHE_WRAP_CONVENTION.md §6.2.
// packages/core/ is framework-agnostic. Enforced via no-restricted-imports
// patterns. Adding a new denied family is a one-line append to `patterns`.
//
// ESLint's no-restricted-imports catches `import type` forms by default
// (verified 2026-04-18). Never set allowTypeImports: true for these groups —
// that would silently break the framework-coupling rule.

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pkg from '../config/eslint/no-new-bg-strings.cjs'

const { NO_NEW_BG_STRINGS_RULE, CONTENT_HOME_GLOBS, TEST_IGNORE_GLOBS } = pkg

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          // React (render-tree / hook / Suspense coupling)
          {
            group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
            message:
              'packages/core/ is framework-agnostic. React.cache wraps at the web call site. See CACHE_WRAP_CONVENTION.md.',
          },
          // Next.js (server-runtime / navigation / image / link)
          {
            group: ['next', 'next/*'],
            message:
              'Next.js imports live in apps/web/. Core takes plain inputs (userId, request body) and returns plain data.',
          },
          // Clerk (framework-specific auth adapters)
          {
            group: [
              '@clerk/nextjs',
              '@clerk/nextjs/**',
              '@clerk/nextjs-server',
              '@clerk/clerk-expo',
              '@clerk/clerk-react',
              '@clerk/clerk-react/**',
            ],
            message:
              'Core takes userId: string | null as an argument. Clerk auth extraction happens at the web/mobile call site.',
          },
          // Expo / React Native (mobile-runtime)
          {
            group: ['expo', 'expo-*', 'expo-*/**', '@expo/**'],
            message:
              'Expo imports live in apps/mobile/. Core is framework-agnostic.',
          },
          {
            group: ['react-native', 'react-native-*', 'react-native-*/**', '@react-native/**'],
            message:
              'React Native imports live in apps/mobile/. Core is framework-agnostic.',
          },
          // Styling (platform-coupled)
          {
            group: ['nativewind', 'nativewind/*', 'react-native-css-interop', 'react-native-css-interop/*'],
            message:
              'Styling is UI concern. Core returns data, not styled components.',
          },
        ],
      }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: TEST_IGNORE_GLOBS,
    rules: NO_NEW_BG_STRINGS_RULE,
  },
  {
    files: CONTENT_HOME_GLOBS,
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
]
