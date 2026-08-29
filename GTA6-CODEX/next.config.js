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
    // Techo subido de 2560 a 3840 (29 ago 2026): las fotos de vehículos ya
    // se importan hasta 3840x2160 real (ver import-real-images.mjs), pero
    // next/image nunca podía servir más de 2560px de ancho aunque el
    // lightbox lo pidiera — quien hacía zoom en el visor terminaba viendo
    // una versión recortada en vez del detalle real de la foto original.
    deviceSizes: [320, 640, 1024, 1440, 1920, 2560, 3840],
    imageSizes: [256, 384, 512, 640, 750, 828, 1024],
  },
  headers: async () => {
    // CSP en modo enforcement. Se validó contra los reportes de la fase
    // Report-Only (GA, thumbnails de YouTube, estilos/scripts inline de
    // Next) sin falsos positivos, así que ahora bloquea de verdad.
    //
    // IMPORTANTE — AdSense: script-src NO incluye pagead2.googlesyndication.com
    // (ni los dominios de doubleclick.net/googlesyndication.com que Google usa
    // para los iframes de anuncios). El código de layout.tsx/ConsentBanner.tsx
    // ya está listo para cargar AdSense (gateado detrás del consentimiento),
    // pero con esta CSP el navegador bloquearía igual el script en cuanto se
    // active NEXT_PUBLIC_ADSENSE_CLIENT_ID. Antes de activar AdSense en serio:
    // volver a poner esta CSP en modo Content-Security-Policy-Report-Only
    // (agregar "-Report-Only" al nombre del header) con una cuenta de AdSense
    // real en staging, mirar en la consola del navegador qué dominios reporta
    // como bloqueados, y recién ahí sumarlos acá — la lista completa de
    // Google cambia con el tiempo, no tiene sentido copiar una fija de
    // antemano. Mismo proceso que ya se usó para validar esta CSP la
    // primera vez (ver comentario arriba).
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
