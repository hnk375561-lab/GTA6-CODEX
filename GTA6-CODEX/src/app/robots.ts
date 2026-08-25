import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://autoficha.vercel.app'

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
