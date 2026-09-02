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
    // E-1 (auditoría, ago 2026) — REVERTIDO, 31 ago 2026: se había migrado
    // esta CSP a nonce por request vía middleware.ts, pero eso obliga a
    // que el layout raíz lea `headers()` en cada request, lo que a su vez
    // fuerza a TODAS las rutas del sitio a renderizarse dinámicamente (ya
    // no estáticas). En Vercel, cada ruta dinámica se despliega como su
    // propia Serverless Function, y el plan Hobby tiene un tope de 12 —
    // este proyecto tiene 18 rutas dinámicas, así que el deploy empezó a
    // fallar con "No more than 12 Serverless Functions can be added to a
    // Deployment on the Hobby plan." Se revierte a CSP estática (definida
    // acá, evaluada una sola vez en build) con 'unsafe-inline' en
    // script-src, igual que antes de la auditoría.
    //
    // Riesgo aceptado: la propia auditoría original ya calificaba esto
    // como severidad MEDIA con riesgo de explotación bajo hoy (sitio con
    // contenido 100% estático desde JSON versionado, sin inputs de
    // usuario que se rendericen sin sanitizar). Si en el futuro se quiere
    // retomar el nonce, hace falta primero pasar a Vercel Pro (sin tope
    // de funciones) o migrar suficientes rutas a runtime edge antes de
    // reintroducir middleware.ts + headers() en el layout raíz.
    //
    // 31 ago 2026 — se suman los dominios de Google AdSense (script-src,
    // img-src, frame-src, connect-src). Sin esto el <Script> de
    // ConsentBanner.tsx hacia pagead2.googlesyndication.com quedaba
    // bloqueado por el navegador (violación de CSP silenciosa: no rompe
    // nada visualmente, pero el anuncio nunca llega a cargar ni a
    // registrar impresión). frame-src/connect-src cubren los iframes de
    // renderizado de ads y los endpoints de Ad Traffic Quality
    // (verificación anti-fraude de Google) y Funding Choices (mensaje de
    // consentimiento propio de Google, separado del ConsentBanner
    // propio del sitio).
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.youtube.com https://i.ytimg.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.g.doubleclick.net; frame-src https://www.youtube.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adtrafficquality.google https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://fundingchoicesmessages.google.com; font-src 'self' data:;"
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
      // Consolidación de rutas de fabricante (#9 audit): `/fabricantes/[slug]`
      // (entidad Manufacturer real, con evidencia/relaciones) y
      // `/vehiculos/fabricante/[manufacturer]` (agrupación ad-hoc por el
      // campo de texto libre `vehicle.manufacturer`) coexistían apuntando
      // al mismo fabricante — confirmado 1:1 sin huérfanos en ninguna
      // dirección entre los 75 `Manufacturer.slug` y los 75 slugs
      // derivados de `vehicle.manufacturer` (mismo slugify). La segunda
      // ruta quedaba además más pobre: listaba TODOS los vehículos del
      // fabricante, pero `/fabricantes/[slug]` los mostraba acotados a 8
      // (panel de relacionados) — 8 fabricantes con más de 8 vehículos
      // perdían unidades en su propia ficha. Se resolvió del lado del
      // panel (ver `[entityType]/[slug]/page.tsx`) y esta ruta vieja
      // ahora redirige 301 a la ficha real, para no perder el SEO ya
      // indexado en `/vehiculos/fabricante/*`.
      {
        source: '/vehiculos/fabricante/:manufacturer',
        destination: '/fabricantes/:manufacturer',
        permanent: true,
      },
    ]
  }
}

module.exports = nextConfig
