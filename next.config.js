/** @type {import('next').NextConfig} */

// Migración a GitHub Pages (hosting 100% estático):
//
// - `output: 'export'` reemplaza el runtime de Vercel/Cloudflare Workers
//   por un `next build` que escribe HTML/CSS/JS ya resueltos en `out/`
//   (ver `.github/workflows/deploy-pages.yml`). Requiere que NINGUNA
//   ruta use APIs dinámicas (`middleware.ts`, `headers()`/`redirects()`
//   de next.config.js, Route Handlers que lean `searchParams`/`cookies`,
//   páginas con `dynamic = 'force-dynamic'`). Ya no queda ninguna: el
//   dashboard interno y las rutas de Mercado Pago se sacaron del build
//   público, y `/api/buscar` se reemplazó por `/search-index.json`
//   (Route Handler estático, ver `src/app/search-index.json/route.ts`).
//
// - `trailingSlash: true` genera `pagina/index.html` en vez de
//   `pagina.html` para cada ruta — el formato que sirve sin fricción el
//   servidor estático de GitHub Pages para URLs sin extensión
//   (`/vehiculos/toyota-corolla/`, no `/vehiculos/toyota-corolla`).
//
// - `basePath`/`assetPrefix`: solo hacen falta si el sitio se publica en
//   `hnk375561-lab.github.io/GTA6-CODEX` (subcarpeta del dominio de
//   GitHub) en vez de un dominio propio en la raíz (`sinfreno.com` vía
//   `public/CNAME`). Se activan solos con la env var
//   `GITHUB_PAGES_BASE_PATH` que ya setea el workflow cuando NO hay
//   dominio propio — ver `.github/workflows/deploy-pages.yml`. Con
//   dominio propio, dejar esa env var vacía/sin setear.
const basePath = process.env.GITHUB_PAGES_BASE_PATH || ''

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  images: {
    // Custom loader — nunca llamó a la Image Optimization API de Vercel
    // ni de ningún otro servidor; sigue funcionando igual en export
    // estático porque solo arma URLs a variantes pregeneradas en
    // `public/images/_optimized/` (scripts/pregenerate-image-variants.mjs).
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
    qualities: [75, 90, 92, 94, 95, 97, 100],
    minimumCacheTTL: 31536000,
    deviceSizes: [320, 640, 1024, 1440, 1920, 2560, 3840],
    imageSizes: [256, 384, 512, 640, 750, 828, 1024],
  },
  // `headers()` y `redirects()` de next.config.js NO se aplican en
  // `output: 'export'` (Next.js los ignora en build y avisa por consola)
  // porque GitHub Pages no ejecuta ningún proceso Next.js en runtime que
  // pueda evaluarlos en cada request — es un servidor de archivos.
  //
  // - CSP / security headers: no tienen reemplazo estático equivalente
  //   sin un CDN propio delante (Cloudflare gratis como proxy, por
  //   ejemplo). Se pierden en esta migración; si hace falta recuperarlos
  //   más adelante, la opción más simple sigue siendo poner Cloudflare
  //   (modo proxy, sin Workers) delante del dominio propio y agregar las
  //   reglas ahí como Response Headers, no acá.
  // - Cache-Control: GitHub Pages ya sirve todo con cache agresivo del
  //   lado del CDN por defecto; no hace falta configurarlo a mano.
  // - El redirect `/vehiculos/fabricante/:manufacturer` →
  //   `/fabricantes/:manufacturer` se resolvió como páginas estáticas
  //   reales con `<meta http-equiv="refresh">` — ver
  //   `src/app/vehiculos/fabricante/[manufacturer]/page.tsx`.
}

module.exports = nextConfig
