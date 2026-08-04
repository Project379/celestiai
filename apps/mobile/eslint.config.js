const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const { NO_NEW_BG_STRINGS_RULE, CONTENT_HOME_GLOBS } = require('../../packages/config/eslint/no-new-bg-strings.cjs')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // @stellaeum/core declares sweph (native N-API addon) as a dep. Several
      // core paths transitively pull it (crystals/today, planets/current,
      // horoscope/transits, charts/calculate). Mobile must use subpath imports
      // that don't pull sweph (e.g. @stellaeum/core/crystals/schemas — zod-only)
      // to keep the Metro bundle clean. Barrel `import x from '@stellaeum/core'`
      // breaks the build.
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@stellaeum/core',
            message: 'Use subpath imports of @stellaeum/core (e.g. @stellaeum/core/crystals/schemas) — barrel imports pull sweph (native Node module) into the Metro bundle and break the build.',
          },
        ],
      }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: NO_NEW_BG_STRINGS_RULE,
  },
  {
    files: CONTENT_HOME_GLOBS,
    rules: { 'no-restricted-syntax': 'off' },
  },
])
