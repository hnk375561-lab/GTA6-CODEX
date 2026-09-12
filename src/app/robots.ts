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
    // 12/09/2026 — SE LEVANTA EL BLOQUEO TOTAL (decisión consciente, no
    // un olvido). El bloqueo del 10/09 se justificaba por el costo de
    // invocación por-request de Cloudflare Workers (`*.workers.dev`) sin
    // dominio propio ni cache de borde real. Esa infraestructura ya no
    // existe: el proyecto migró a `output: 'export'` sobre GitHub Pages
    // (ver next.config.js), que sirve archivos estáticos desde un CDN
    // sin invocación ni cuota por request — el motivo original del
    // bloqueo no aplica más. Todo el trabajo de SEO (JSON-LD, sitemap,
    // metadata, Open Graph, verificación de Search Console) ya está
    // listo y hasta ahora inerte; con este cambio pasa a ser efectivo.
    //
    // Se mantiene (cumpliendo la intención ya declarada pero nunca
    // implementada) un bloqueo explícito a los crawlers de entrenamiento
    // de IA más conocidos — no afecta la indexación en buscadores.
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'Google-Extended',
          'anthropic-ai',
          'ClaudeBot',
          'Claude-Web',
          'Bytespider',
          'PerplexityBot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
