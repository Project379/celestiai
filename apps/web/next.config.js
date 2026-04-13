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
}

module.exports = nextConfig
