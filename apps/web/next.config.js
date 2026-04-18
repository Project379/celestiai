/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nativewind', 'react-native-css-interop'],
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
