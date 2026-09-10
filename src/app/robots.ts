import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/site'

// Requerido por Next.js cuando el proyecto usa `output: "export"`
// (export estático, necesario para desplegar en GitHub Pages, que no
// corre un servidor Node). Sin esta línea, `next build` falla con:
// "export const dynamic = force-static/export const revalidate not
// configured on route /robots.txt with output: export".
export const dynamic = 'force-static'

/**
 * Genera /robots.txt (convención nativa del App Router: cualquier export
 * default de src/app/robots.ts se sirve automáticamente en esa ruta).
 *
 * Reemplaza a seo.ts:generateRobotsTxt(), que tenía exactamente estas
 * mismas reglas escritas pero nunca estaba conectada a ninguna ruta —
 * el archivo no se servía en producción. Se preservan las mismas reglas
 * (incluyendo el bloqueo explícito a crawlers de entrenamiento de IA) para
 * no cambiar ninguna decisión de producto ya tomada, solo hacerla real.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    // 10/09/2026 — BLOQUEO TOTAL TEMPORAL: el sitio corre 100% sobre
    // `*.workers.dev` (sin dominio propio conectado), lo que significa
    // que NINGÚN request se cachea en el borde de Cloudflare — cada
    // página que un crawler visita reinvoca el Worker completo y arrastra
    // decenas de assets (JS/CSS/imágenes) con él. Con el sitio recién
    // publicado y sin necesidad de indexación real todavía (uso actual:
    // solo el propio dueño), dejar pasar crawlers normales (Googlebot,
    // Bingbot, etc., antes permitidos) es la fuente más probable del
    // consumo de cuota diaria sin que haya visitas humanas de terceros.
    // Sacar este bloqueo total en cuanto: (a) se conecte un dominio propio
    // (Cache-Control ya está listo para eso en next.config.js) y/o (b) el
    // sitio esté listo para indexarse de verdad.
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
