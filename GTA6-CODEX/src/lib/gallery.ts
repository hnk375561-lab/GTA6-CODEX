import type { Trailer } from '@/types'
import { EntityType } from '@/types'
import { getEntitiesByType } from './entities'
import { resolveEntityImage, ENTITY_IMAGE_CATEGORIES } from './images'
import { getMediaAssets, resolveMediaRender } from './media'

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
 * Metadata y procedencia tomadas directamente de los comentarios de
 * `RotatingHeroBackground.tsx` y de `IMAGE_CATALOG.md` (rondas 6-8):
 * cada nota de crédito acá es trazable a ese material, no inventada.
 */
const KEY_ART: Array<Omit<GalleryItem, 'categorySlug' | 'categoryLabel' | 'trailerAppearances'>> = [
  {
    id: 'key-art-boxart-sunset',
    src: '/images/heroes/hero-gta6-boxart-sunset.webp',
    alt: 'Key art oficial de portada de GTA VI, con Jason Duval y Lucia Caminos frente a Vice City al atardecer',
    title: 'Portada oficial — Jason y Lucia',
    description:
      'Key art oficial de portada de Grand Theft Auto VI: Jason Duval y Lucia Caminos frente al skyline de Vice City al atardecer. La pieza más reconocible del material promocional del juego.',
    credit: 'Rockstar Games — key art oficial de portada',
    featured: true,
  },
  {
    id: 'key-art-port-gellhorn',
    src: '/images/heroes/hero-port-gellhorn-postcard.webp',
    alt: 'Postal promocional oficial "Visit Leonida" de Port Gellhorn',
    title: 'Postal "Visit Leonida" — Port Gellhorn',
    description:
      'Material promocional oficial de la campaña "Visit Leonida", ambientado en el pueblo costero de Port Gellhorn: composición panorámica sin personajes en primer plano.',
    credit: 'Rockstar Games — material promocional "Visit Leonida"',
  },
  {
    id: 'key-art-vintage-dock',
    src: '/images/heroes/hero-vintage-dock-sunset.webp',
    alt: 'Key art del Vintage Vice City Pack, pareja junto a un Declasse Stanier en un muelle al atardecer',
    title: 'Vintage Vice City Pack — muelle al atardecer',
    description:
      'Key art oficial del Vintage Vice City Pack: una pareja junto a un Declasse Stanier en un muelle, con la luz cálida del atardecer.',
    credit: 'Rockstar Games — Vintage Vice City Pack',
  },
  {
    id: 'key-art-vintage-hotel',
    src: '/images/heroes/hero-vintage-hotel-neon.webp',
    alt: 'Key art del Vintage Vice City Pack frente al letrero de neón del Ocean View Hotel',
    title: 'Vintage Vice City Pack — neón del Ocean View Hotel',
    description:
      'Key art oficial del Vintage Vice City Pack frente al letrero de neón del Ocean View Hotel, con la iluminación nocturna característica del pack.',
    credit: 'Rockstar Games — Vintage Vice City Pack',
  },
  {
    id: 'key-art-vice-sunset',
    src: '/images/heroes/hero-vice-sunset.webp',
    alt: 'Panorámica oficial de Vice City al atardecer',
    title: 'Vice City al atardecer',
    description:
      'Panorámica oficial de Vice City al atardecer, uno de los fondos originales usados en el hero del sitio.',
    credit: 'Rockstar Games — material oficial',
  },
  {
    id: 'key-art-vi-logo',
    src: '/images/heroes/hero-vi-logo.webp',
    alt: 'Presentación oficial del logotipo de Grand Theft Auto VI',
    title: 'Logo oficial de GTA VI',
    description: 'Pieza de branding oficial usada en la presentación y el anuncio de Grand Theft Auto VI.',
    credit: 'Rockstar Games — material oficial',
  },
]

const CATEGORY_LABELS: Partial<Record<EntityType, string>> = {
  [EntityType.CHARACTER]: 'Personajes',
  [EntityType.LOCATION]: 'Ubicaciones',
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.FACTION]: 'Organizaciones',
  [EntityType.BUSINESS]: 'Negocios',
  [EntityType.OBJECT]: 'Objetos',
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

      items.push({
        id: key,
        src: resolved.src,
        alt: resolved.alt,
        title: entity.title,
        description: entity.description,
        categorySlug: entity.type,
        categoryLabel: CATEGORY_LABELS[entity.type] || entity.type,
        status: entity.status,
        href: `/${entity.type}/${entity.slug}`,
        entityType: entity.type,
        entitySlug: entity.slug,
        credit: entity.image?.credit || 'Rockstar Games — material oficial (aportado por captura verificada)',
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
