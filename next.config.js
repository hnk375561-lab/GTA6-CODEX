/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Custom loader replaces Vercel Image Optimization API.
    // Variants are pre-generated at build time by scripts/pregenerate-image-variants.mjs
    // and served from public/images/_optimized/ — next/image never calls the
    // Vercel Image Optimization API, so quota limits don't apply.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    // YouTube thumbnails used by <YouTubeEmbed> — validated by next/image
    // before invoking the custom loader.
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
    // Explicit quality values allowed (Next.js 15.5+ requirement).
    // Matches qualities used by Image components across the project.
    qualities: [75, 90, 92, 94, 95, 97, 100],
    minimumCacheTTL: 31536000,
    // Max device width 3840px — matches source image resolution.
    deviceSizes: [320, 640, 1024, 1440, 1920, 2560, 3840],
    imageSizes: [256, 384, 512, 640, 750, 828, 1024],
  },
  headers: async () => {
    // Static CSP (evaluated once at build) — avoids forcing all routes
    // to dynamic rendering via middleware + headers() in root layout.
    // Includes Google AdSense/Analytics domains for ads and tracking.
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.youtube.com https://i.ytimg.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.g.doubleclick.net; frame-src https://www.youtube.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adtrafficquality.google https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://fundingchoicesmessages.google.com https://docs.google.com; font-src 'self' data:;"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
  redirects: async () => {
    return [
      // Consolidation: /vehiculos/fabricante/[manufacturer] -> /fabricantes/[slug]
      // Both routes pointed to same manufacturer; old route redirects 301
      // to preserve SEO indexed under /vehiculos/fabricante/*
      {
        source: '/vehiculos/fabricante/:manufacturer',
        destination: '/fabricantes/:manufacturer',
        permanent: true,
      },
    ]
  }
}

module.exports = nextConfig
