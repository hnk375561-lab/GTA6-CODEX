import type { MetadataRoute } from 'next'
import { EntityType } from '@/types'
import { getAllEntities, getEntityCountsByType } from '@/lib/entities'
import { getVehiclesByManufacturer } from '@/lib/vehicle-manufacturers'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-codex.vercel.app'

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
    {
      url: `${SITE_URL}/buscar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/galeria`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
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

  // Páginas de agregación por fabricante de vehículo (roadmap punto 4):
  // exponen el mismo dato ya validado en cada ficha, así que su fecha de
  // modificación se ata al vehículo más reciente del grupo en vez de
  // usar `new Date()` fijo, que mentiría sobre qué tan "fresca" es cada URL.
  const manufacturerGroups = await getVehiclesByManufacturer()
  const manufacturerRoutes: MetadataRoute.Sitemap = Array.from(manufacturerGroups.values()).map(
    (group) => ({
      url: `${SITE_URL}/vehiculos/fabricante/${group.slug}`,
      lastModified: group.vehicles.reduce(
        (latest, v) => (safeDate(v.updatedAt) > latest ? safeDate(v.updatedAt) : latest),
        safeDate(group.vehicles[0].updatedAt)
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })
  )

  return [...staticRoutes, ...listRoutes, ...entityRoutes, ...manufacturerRoutes]
}
