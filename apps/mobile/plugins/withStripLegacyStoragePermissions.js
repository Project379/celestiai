// See withEmulatorLoopbackCleartext.js for why this imports from
// `expo/config-plugins` rather than `@expo/config-plugins`.
const { withAndroidManifest } = require('expo/config-plugins')

// expo-file-system declares READ/WRITE_EXTERNAL_STORAGE in its library
// manifest and Gradle merges it into every build. We never touch shared
// storage (no downloads, no media library), so the app shouldn't ask for it
// or show it in the Play Console permission list. `tools:node="remove"`
// makes the manifest merger drop the library's entries.
const PERMISSIONS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
]

module.exports = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools'

    const permissions = manifest['uses-permission'] ?? []
    for (const name of PERMISSIONS) {
      const existing = permissions.find((p) => p.$['android:name'] === name)
      if (existing) {
        existing.$['tools:node'] = 'remove'
      } else {
        permissions.push({ $: { 'android:name': name, 'tools:node': 'remove' } })
      }
    }
    manifest['uses-permission'] = permissions
    return config
  })
