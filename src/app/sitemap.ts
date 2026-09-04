import type { MetadataRoute } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { getAllEntities, getEntitiesByType, getEntityCountsByType } from '@/lib/entities'
import { computeSeoCategoryOptions, categoryToSlug } from '@/lib/vehicle-category'
import { getFixedComparisonPairs, fixedComparisonSlug } from '@/lib/fixed-comparisons'
import { getAvailableRankings } from '@/lib/rankings'
import { SITE_URL } from '@/config/site'

/**
 * Parsea una fecha de entidad de forma segura. entities.ts:validateEntity()
 * ya rechaza (con warning) cualquier entidad con updatedAt no parseable, así
 * que esto no debería activarse en la práctica — pero esta función es la
 * responsable de que /sitemap.xml (prerenderizada en build time) NUNCA
 * pueda tirar abajo `next build` completo por una fecha malformada,
 * incluso si esa garantía de entities.ts cambiara en el futuro. Un
 * Invalid Date sin este guard revienta con RangeError al llamarse
 * .toISOString() dentro del route handler de Next — confirmado
 * reproduciendo el build real con un fixture.
 */
function safeDate(value: string): Date {
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}

/**
 * Genera /sitemap.xml (convención nativa del App Router de Next.js:
 * cualquier export default de src/app/sitemap.ts se sirve automáticamente
 * en esa ruta, sin registro manual).
 *
 * seo.ts ya declaraba `Sitemap: ${SITE_URL}/sitemap.xml` dentro de
 * generateRobotsTxt(), pero esa función nunca estaba conectada a ninguna
 * ruta real — el sitemap que anunciaba no existía. Este archivo es el que
 * lo hace real.
 *
 * Incluye únicamente tipos de entidad con al menos una entrada publicada:
 * un tipo vacío no aporta nada al sitemap y anunciar una URL de listado
 * vacía a los motores de búsqueda no tiene valor SEO.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allEntities, countsByType] = await Promise.all([
    getAllEntities(),
    getEntityCountsByType(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // /buscar ya NO está acá ni indexado: es resultados de búsqueda sin
    // contenido único indexable (mismo criterio que /favoritos). Era la
    // serverless más cara del sitio (recarga las 341 entidades + conteo de
    // relaciones en cada recrawl). Ver robots en src/app/buscar/page.tsx.
    {
      url: `${SITE_URL}/galeria`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/comparar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/tramites-vehiculo`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/financiamiento`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // Rutas comerciales/landings indexables (auditoría sept 2026): las 5
    // que quedaron fuera del sitemap mientras existían (eran funcionales y
    // sin noindex). `/concesionarias-concepcion-del-uruguay` cubre
    // búsqueda local que el resto del sitio no captura.
    {
      url: `${SITE_URL}/anunciate`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/licencia-datos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/vender-tu-auto`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/vender-tu-auto/cartel`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/concesionarias-concepcion-del-uruguay`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terminos`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // /mapa queda fuera a propósito: lleva `robots: { index: false }`
    // (ver src/app/mapa/page.tsx) mientras sea el stub "en construcción".
    // Agregarla acá otra vez el día que tenga contenido real.
  ]

  const listRoutes: MetadataRoute.Sitemap = Object.values(EntityType)
    .filter((type) => countsByType[type] > 0)
    .map((type) => ({
      url: `${SITE_URL}/${type}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))

  const entityRoutes: MetadataRoute.Sitemap = allEntities.map((entity) => ({
    url: `${SITE_URL}/${entity.type}/${entity.slug}`,
    lastModified: safeDate(entity.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: entity.featured ? 0.9 : 0.6,
  }))

  // Hub `/categorias` (FASE 6, Gap 1) + páginas de categoría amplia
  // (/categorias/suv, /categorias/sedan...) — oportunidad #7 del audit.
  // `computeSeoCategoryOptions` es la única fuente de verdad para el
  // umbral (MIN_VEHICLES_PER_SEO_CATEGORY) y la exclusión de 'Otros',
  // compartida con `/categorias/[grupo]/page.tsx` y el hub, para no
  // anunciar en el sitemap una URL que la página real respondería con
  // 404 (notFound()).
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const categoryGroups = computeSeoCategoryOptions(vehicles)
  const categoryRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/categorias`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...categoryGroups.map(({ group }) => ({
      url: `${SITE_URL}/categorias/${categoryToSlug(group)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]

  // Comparaciones fijas 1-a-1 (/comparar/audi-a4-vs-bmw-serie-3...) —
  // oportunidad #11 del audit. Derivadas únicamente de relaciones
  // `competidor` curadas en el contenido (ver fixed-comparisons.ts), no
  // de todas las combinaciones posibles — evita el thin/duplicate content
  // que la Fase 19 ("DO NOT BUILD YET", punto 4) descarta explícitamente.
  const comparisonPairs = getFixedComparisonPairs(vehicles)
  const comparisonRoutes: MetadataRoute.Sitemap = comparisonPairs.map(({ slugA, slugB }) => ({
    url: `${SITE_URL}/comparar/${fixedComparisonSlug(slugA, slugB)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Rankings programáticos (FASE 3) — solo se anuncian los que superan el
  // umbral de contenido (`getAvailableRankings` ya filtra por
  // `isRankingEligible`, mismo criterio que usa `generateStaticParams` en
  // `/rankings/[slug]/page.tsx`), para no anunciar una URL que no exista
  // o que responda 404.
  const rankings = await getAvailableRankings()
  const rankingRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/rankings`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...rankings.map((ranking) => ({
      url: `${SITE_URL}/rankings/${ranking.def.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]

  // Antes acá se agregaban además `/vehiculos/fabricante/{slug}` (roadmap
  // punto 4): esa ruta se consolidó en `/fabricantes/{slug}` —la ficha
  // real de la entidad Manufacturer, ya incluida arriba en
  // `entityRoutes`— y ahora redirige 301 (ver next.config.js, #9 audit).
  // Anunciar la URL vieja en el sitemap solo le pediría a los motores de
  // búsqueda que indexen una redirección en vez de la URL final.

  return [...staticRoutes, ...listRoutes, ...categoryRoutes, ...comparisonRoutes, ...rankingRoutes, ...entityRoutes]
}
