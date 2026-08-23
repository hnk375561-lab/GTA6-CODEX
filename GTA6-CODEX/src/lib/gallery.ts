import type { Trailer } from '@/types'
import { EntityType } from '@/types'
import { getEntitiesByType } from './entities'
import { resolveEntityImage, ENTITY_IMAGE_CATEGORIES } from './images'
import { getMediaAssets, resolveMediaRender } from './media'

/**
 * El registro `real-images-manifest.json` (trazabilidad de sourcing de
 * imágenes oficiales de Rockstar/GTA6) se eliminó junto con el resto del
 * contenido de GTA6 — ver plan de migración. Con él se fue también el
 * distingo "ilustración IA vs. oficial", que no aplica al nicho de autos
 * (acá las fotos son stock libre de derechos o propias, no key art de
 * un juego). Si en el futuro hace falta distinguir tipos de fuente de
 * imagen otra vez, se puede reintroducir vía el campo `image.source` que
 * ya existe en el schema de cada entidad (`ImageProvenanceSchema`), sin
 * necesidad de un manifest aparte.
 */
const AI_ILLUSTRATION_KEYS = new Set<string>()

/**
 * SISTEMA DE GALERÍA — AGREGACIÓN DE ASSETS REALES
 * ==================================================
 *
 * No existe una tabla de "imágenes de galería": esta capa reutiliza los
 * dos únicos orígenes reales de fotografía que ya tiene el proyecto:
 *
 *   1. Imágenes de ficha de entidad, resueltas por convención de archivo
 *      (ver `resolveEntityImage` en `images.ts`), para las categorías que
 *      hoy tienen al menos un archivo en `public/images/entities/{type}/`.
 *   2. Los fondos "key art" del hero de la home (`RotatingHeroBackground`),
 *      que son key art oficial / material promocional de Rockstar Games
 *      pero no están atados a ninguna entidad individual.
 *
 * No se inventan imágenes ni metadata: si una entidad no tiene archivo
 * resuelto, simplemente no aparece en la galería (la cobertura crece sola
 * a medida que se integran más imágenes vía `scripts/process-images.mjs`,
 * sin tocar este archivo).
 */

export interface GalleryTrailerAppearance {
  trailerSlug: string
  trailerTitle: string
  sceneId: string
  sceneTitle: string
  timestamp: string
}

export interface GalleryItem {
  id: string
  /** 'image' (default, retrocompatible) o 'video' — un asset de video embebido (hoy, YouTube). */
  kind?: 'image' | 'video'
  src: string
  alt: string
  title: string
  description: string
  categorySlug: string
  categoryLabel: string
  status?: 'confirmado' | 'rumor' | 'nuestro'
  href?: string
  entityType?: EntityType
  entitySlug?: string
  credit: string
  sourceNote?: string
  tags?: string[]
  featured?: boolean
  trailerAppearances: GalleryTrailerAppearance[]
  /** Solo si kind === 'video': ID de embed de YouTube, para reproducir en el lightbox. */
  videoEmbedId?: string
  /** Solo si kind === 'video' directo: URL resuelta para el reproductor nativo. */
  videoSrc?: string
}

/**
 * Key art / fondos que no pertenecen a una entidad individual.
 *
 * El key art original acá era material promocional oficial de Rockstar
 * Games para GTA6 (portadas, postales "Visit Leonida", packs temáticos) —
 * se eliminó junto con los archivos de imagen que referenciaba (ver plan
 * de migración). No hay equivalente directo para un sitio de autos: no
 * existe "key art" de fabricante que podamos usar del mismo modo sin caer
 * en el mismo problema (fotos de marca sin licencia). Queda vacío a
 * propósito — si en el futuro se suma un asset de portada propio, entra
 * acá como una entrada nueva.
 */
const KEY_ART: Array<Omit<GalleryItem, 'categorySlug' | 'categoryLabel' | 'trailerAppearances'>> = []

const CATEGORY_LABELS: Partial<Record<EntityType, string>> = {
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.LOCATION]: 'Ubicaciones',
  [EntityType.BUSINESS]: 'Negocios',
}

/**
 * Indexa qué entidades aparecen en qué escenas de trailer, reutilizando
 * las mismas `relations` que ya conecta `TrailerScenes.tsx`. Esto es lo
 * que habilita, en la galería, mostrar "aparece en Trailer 1, escena 03"
 * junto a una foto de personaje/ubicación sin duplicar el modelo de datos.
 */
async function buildTrailerAppearanceIndex(): Promise<Map<string, GalleryTrailerAppearance[]>> {
  const index = new Map<string, GalleryTrailerAppearance[]>()
  const trailers = (await getEntitiesByType(EntityType.TRAILER)) as Trailer[]

  for (const trailer of trailers) {
    for (const scene of trailer.scenes) {
      for (const rel of scene.relations || []) {
        const key = `${rel.targetType}/${rel.targetSlug}`
        const appearance: GalleryTrailerAppearance = {
          trailerSlug: trailer.slug,
          trailerTitle: trailer.title,
          sceneId: scene.id,
          sceneTitle: scene.title,
          timestamp: scene.timestamp,
        }
        if (!index.has(key)) index.set(key, [])
        index.get(key)!.push(appearance)
      }
    }
  }

  return index
}

/**
 * Reúne todos los ítems reales de la galería, ordenados con las piezas
 * destacadas primero (key art de portada + entidades `featured`) y luego
 * alfabéticamente dentro de cada categoría.
 */
export async function getGalleryItems(): Promise<GalleryItem[]> {
  const trailerIndex = await buildTrailerAppearanceIndex()
  const items: GalleryItem[] = []

  for (const type of ENTITY_IMAGE_CATEGORIES) {
    const entities = await getEntitiesByType(type)
    for (const entity of entities) {
      const resolved = resolveEntityImage(entity)
      if (!resolved) continue

      const key = `${entity.type}/${entity.slug}`
      const trailerAppearances = trailerIndex.get(key) || []
      const isAiIllustration = AI_ILLUSTRATION_KEYS.has(key)

      items.push({
        id: key,
        src: resolved.src,
        alt: resolved.alt,
        title: entity.title,
        description: entity.description,
        categorySlug: entity.type,
        categoryLabel: CATEGORY_LABELS[entity.type] || entity.type,
        // El status de la card de galería describe la IMAGEN, no la entidad:
        // si la foto es una ilustración IA, se muestra 'nuestro' sin importar
        // si la entidad en sí está 'confirmado' en el juego (son preguntas
        // distintas — ver nota de AI_ILLUSTRATION_KEYS arriba).
        status: isAiIllustration ? 'nuestro' : entity.status,
        href: `/${entity.type}/${entity.slug}`,
        entityType: entity.type,
        entitySlug: entity.slug,
        credit: isAiIllustration ? 'Ilustración generada por IA' : entity.image?.credit || 'Fuente propia',
        sourceNote: entity.evidence?.note,
        tags: entity.tags,
        featured: entity.featured,
        trailerAppearances,
      })
    }
  }

  for (const art of KEY_ART) {
    items.push({
      ...art,
      categorySlug: 'key-art',
      categoryLabel: 'Key Art',
      trailerAppearances: [],
    })
  }

  // Videos de tráiler del Media Registry: se listan en la galería como
  // tarjetas 'video' (miniatura de YouTube, reproducción en el lightbox),
  // en vez de necesitar una categoría/pipeline aparte de "videos".
  const trailerEntities = (await getEntitiesByType(EntityType.TRAILER)) as Trailer[]
  const trailerBySlug = new Map(trailerEntities.map((t) => [t.slug, t]))

  for (const asset of getMediaAssets()) {
    if (!['trailer', 'video', 'clip', 'artwork'].includes(asset.kind)) continue
    const rendered = resolveMediaRender(asset)
    if (rendered.renderAs !== 'youtube' && rendered.renderAs !== 'video') continue

    const trailerSlug = asset.relations?.trailer?.trailerSlug
    const entityRelation = asset.relations?.entities?.[0]
    const trailerEntity = trailerSlug ? trailerBySlug.get(trailerSlug) : undefined

    items.push({
      id: asset.id,
      kind: 'video',
      src: rendered.thumbnailSrc,
      alt: rendered.title,
      title: rendered.title,
      description: trailerEntity?.description || asset.description || '',
      categorySlug: asset.kind === 'clip' ? 'clips' : asset.kind === 'artwork' ? 'key-art' : 'trailers',
      categoryLabel: asset.kind === 'clip' ? 'Clips' : asset.kind === 'artwork' ? 'Key Art' : 'Trailers',
      status: trailerEntity?.status,
      href: trailerSlug ? `/trailers/${trailerSlug}` : entityRelation ? `/${entityRelation.entityType}/${entityRelation.entitySlug}` : undefined,
      entityType: trailerSlug ? EntityType.TRAILER : entityRelation?.entityType,
      entitySlug: trailerSlug || entityRelation?.entitySlug,
      credit: asset.credit || asset.source.provider,
      sourceNote: asset.source.hotlinkNote,
      tags: asset.tags,
      featured: trailerEntity?.featured,
      trailerAppearances: [],
      videoEmbedId: rendered.embedId,
      videoSrc: rendered.videoSrc,
    })
  }

  return items.sort((a, b) => {
    // Recreaciones IA siempre al final, sean de la categoría que sean: todo
    // el material real (oficial de Rockstar o fuente secundaria confiable)
    // va primero. Dentro de cada uno de esos dos grupos se mantiene el
    // orden anterior (destacados primero, luego categoría, luego título).
    const aIsAi = a.status === 'nuestro'
    const bIsAi = b.status === 'nuestro'
    if (aIsAi !== bIsAi) return aIsAi ? 1 : -1
    if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1
    if (a.categorySlug !== b.categorySlug) return a.categorySlug.localeCompare(b.categorySlug, 'es')
    return a.title.localeCompare(b.title, 'es')
  })
}

export interface GalleryCategoryCount {
  slug: string
  label: string
  count: number
}

/**
 * Cuenta ítems por categoría, en el mismo orden de aparición que ya
 * trae `items` (destacadas primero) — usado para las pills de filtro.
 */
export function getGalleryCategoryCounts(items: GalleryItem[]): GalleryCategoryCount[] {
  const order: string[] = []
  const counts = new Map<string, GalleryCategoryCount>()

  for (const item of items) {
    if (!counts.has(item.categorySlug)) {
      counts.set(item.categorySlug, { slug: item.categorySlug, label: item.categoryLabel, count: 0 })
      order.push(item.categorySlug)
    }
    counts.get(item.categorySlug)!.count += 1
  }

  return order.map((slug) => counts.get(slug)!)
}
