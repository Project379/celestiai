const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    'nativewind',
    'react-native-css-interop',
    '@celestia/astrology',
    '@celestia/core',
  ],
  // sweph is a native N-API module (Swiss Ephemeris C/C++ bindings via
  // node-gyp). Next.js's default Webpack behaviour tries to bundle it,
  // which fails because the .node binary can't be bundled — under Node
  // 24's stricter URL handling the failure surfaces as a confusing
  // "path must be string or URL. Received URL" error at the bundled-
  // module require frame. serverExternalPackages tells Next to
  // externalize sweph so it's require()'d natively at runtime, which
  // is how the Vitest-backed CI path already resolves it. Verified
  // 2026-04-21 that sweph.calc_ut works standalone at Node 24 via
  // `node -e` from packages/astrology — confirming the issue is
  // bundler-only, not runtime. See doc-drift tracker #14 at
  // .planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md.
  serverExternalPackages: ['sweph'],
  // Belt-and-suspenders externalization at the Webpack layer. The
  // serverExternalPackages config above is the newer sugar but did not
  // take effect through three attempted configurations on Next 15.5.9
  // — sweph still ended up in the RSC server vendor chunks with
  // `webpack=true` confirmed via node-gyp-build's self-detection.
  // Explicit `config.externals` is the known-working pattern for
  // native modules (sweph, sharp, bcrypt, etc.) across Next.js
  // versions. Paired with the pinned `next: 15.2.4` in package.json
  // so a future 15.5+ regression is not regression-sensitive on this
  // code path. See doc-drift tracker #14.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'sweph']
    }
    return config
  },
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@clerk/nextjs',
      '@clerk/themes',
      '@clerk/localizations',
      'date-fns',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
    ],
  },
  // Legacy-route redirects for the Phase-A IA move (MOBILE_UX_RESEARCH §10).
  // permanent:false during the mobile-parallel-test branch so we can revise
  // without 301 caching; flip to true once the shape is locked.
  async redirects() {
    return [
      { source: '/transits',             destination: '/rhythm',              permanent: false },
      { source: '/transits/:path*',      destination: '/rhythm/:path*',       permanent: false },
      { source: '/manifest',             destination: '/rhythm/journal',      permanent: false },
      { source: '/manifest/:path*',      destination: '/rhythm/journal/:path*', permanent: false },
      { source: '/crystals',             destination: '/you/crystals',        permanent: false },
      { source: '/crystals/:path*',      destination: '/you/crystals/:path*', permanent: false },
      { source: '/recommendations',      destination: '/you/recommendations', permanent: false },
      { source: '/recommendations/:path*', destination: '/you/recommendations/:path*', permanent: false },
      { source: '/astrology-guide',      destination: '/you/guide',           permanent: false },
      { source: '/astrology-guide/:path*', destination: '/you/guide/:path*',   permanent: false },
    ]
  },
}

// Config-load diagnostic — fires at Next.js boot time. Confirms the file
// is actually being read and surfaces the current externalization config
// values. If this line doesn't appear near the top of `pnpm dev` output,
// the config file isn't being loaded by Next (cache / resolution issue).
// Can be removed after the sweph-externalization saga stabilizes.
console.log(
  '[next.config] loaded. serverExternalPackages:',
  nextConfig.serverExternalPackages,
  'webpack externals hook:',
  typeof nextConfig.webpack === 'function' ? 'present' : 'missing',
)

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  silent: !process.env.CI,
})
