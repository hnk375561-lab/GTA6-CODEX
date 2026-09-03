import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/site'

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
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /api/ ya no está vacío (03/09/2026: rutas del reporte comparativo
        // premium, ver src/app/api/premium-report/*) — se mantiene
        // bloqueado igual, son endpoints transaccionales sin contenido que
        // indexar. /admin/ sigue sin existir, se deja preventivo.
        disallow: ['/.next/', '/api/', '/admin/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
