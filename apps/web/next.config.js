/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nativewind', 'react-native-css-interop'],
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

module.exports = nextConfig
