/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 750, 828, 1024, 1080, 1200, 1440, 1536, 1920, 2048, 2560, 3440, 3840],
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
    // CSP en modo Report-Only a propósito: permite medir qué bloquearía
    // sin romper nada en producción (GA, thumbnails de YouTube, y los
    // propios estilos/scripts inline que ya usa Next). Una vez confirmado
    // en los reportes que no hay falsos positivos, cambiar el nombre del
    // header a 'Content-Security-Policy' (sin '-Report-Only') para que
    // bloquee de verdad.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://img.youtube.com https://i.ytimg.com",
      "frame-src https://www.youtube.com",
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
      "font-src 'self' data:",
    ].join('; ')

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
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: csp
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
