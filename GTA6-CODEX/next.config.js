/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Miniaturas de YouTube usadas por <YouTubeEmbed> (facade de los
    // tráilers migrados desde el Vercel Blob externo caído). Sin esto,
    // next/image lanza "hostname not configured" y el componente nunca
    // llega a renderizar nada.
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
    // Next.js 15.5+ ya no acepta 'quality' como opción global; ahora hay
    // que declarar explícitamente qué valores de quality están permitidos
    // vía 'qualities'. Estos son los valores usados por los distintos
    // componentes <Image> del proyecto (EntityImage, GalleryExplorer,
    // MediaCarousel, CompareExplorer, VehicleCompareSheet, SimpleLightbox).
    qualities: [75, 90, 92, 94, 95, 97, 100],
    minimumCacheTTL: 31536000,
    deviceSizes: [320, 640, 1024, 1440, 1920, 2560],
    imageSizes: [256, 384, 512, 640, 750, 828, 1024],
  },
  headers: async () => {
    // CSP en modo enforcement. Se validó contra los reportes de la fase
    // Report-Only (GA, thumbnails de YouTube, estilos/scripts inline de
    // Next) sin falsos positivos, así que ahora bloquea de verdad.
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
            key: 'Content-Security-Policy',
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
