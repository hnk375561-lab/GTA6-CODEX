/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 640, 750, 828, 1024, 1280, 1536, 1920, 2048, 2560, 3840],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 'fs' y 'path' se usan en src/lib/entities.ts para leer el contenido
      // JSON en el servidor (Server Components). El bundle del cliente no
      // los necesita; esto evita que webpack intente resolverlos ahí.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }
    return config
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
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
          }
        ]
      }
    ]
  },
  redirects: async () => {
    return []
  }
}

module.exports = nextConfig
