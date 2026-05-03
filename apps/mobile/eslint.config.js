const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // @celestia/core declares sweph (native N-API addon) as a dep. Several
      // core paths transitively pull it (crystals/today, planets/current,
      // horoscope/transits, charts/calculate). Mobile must use subpath imports
      // that don't pull sweph (e.g. @celestia/core/crystals/schemas — zod-only)
      // to keep the Metro bundle clean. Barrel `import x from '@celestia/core'`
      // breaks the build.
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@celestia/core',
            message: 'Use subpath imports of @celestia/core (e.g. @celestia/core/crystals/schemas) — barrel imports pull sweph (native Node module) into the Metro bundle and break the build.',
          },
        ],
      }],
    },
  },
])
