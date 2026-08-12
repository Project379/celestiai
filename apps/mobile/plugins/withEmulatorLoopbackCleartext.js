// Imported from `expo/config-plugins`, not `@expo/config-plugins` directly —
// `expo` is a real declared dependency of this package (the framework
// itself), so this re-export can't become a phantom dependency the way a
// direct @expo/config-plugins import did (resolved locally by pnpm-store
// accident, absent on EAS). See HANDOFF-CC-2026-08-11.md for the incident.
const { withDangerousMod, withAndroidManifest, AndroidConfig } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

// 10.0.2.2 is the Android emulator's documented alias for the host
// machine's loopback interface (developer.android.com/studio/run/emulator-networking)
// — never a real routable domain, so this config is inert in any build
// (including production) whose EXPO_PUBLIC_API_BASE points at a real HTTPS
// host. Scoped to this one domain rather than a blanket
// android:usesCleartextTraffic="true" so no other traffic is affected.
const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">10.0.2.2</domain>
    </domain-config>
</network-security-config>
`

const withNetworkSecurityConfigFile = (config) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml')
      fs.mkdirSync(xmlDir, { recursive: true })
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), NETWORK_SECURITY_CONFIG_XML)
      return config
    },
  ])

const withNetworkSecurityConfigManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults)
    mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config'
    return config
  })

module.exports = (config) => withNetworkSecurityConfigManifest(withNetworkSecurityConfigFile(config))
