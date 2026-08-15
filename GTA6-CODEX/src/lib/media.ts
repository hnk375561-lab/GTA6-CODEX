import type { Entity, Trailer } from '@/types'
import { EntityType } from '@/types'
import type { MediaAsset, RenderableMedia } from '@/types/media'
import { getEntitiesByTypeSync } from './entities'
import { resolveEntityImage } from './images'

/**
 * SISTEMA DE MEDIA (video / trailers)
 * ======================================
 * Este módulo no existía en el repo original: `gallery.ts` y la ficha de
 * entidad (`[entityType]/[slug]/page.tsx`) ya importaban `getMediaAssets`,
 * `resolveMediaRender` y `getMediaForEntity` desde `@/lib/media`, pero el
 * archivo nunca se había creado — el build fallaba con
 * "Cannot find module '@/lib/media'".
 *
 * No se inventa una fuente de datos nueva: el único material audiovisual
 * real que ya existe en el contenido es `Trailer.officialUrl` (URL de
 * YouTube del trailer oficial, ver `src/types/entity.ts`). Este módulo
 * deriva los `MediaAsset` de tipo 'trailer' directamente de esa propiedad,
 * y arma "media relacionada" para una entidad combinando:
 *   1) su propio retrato (si tiene imagen resuelta vía `images.ts`),
 *   2) los trailers en cuya(s) escena(s) aparece (según las `relations`
 *      que cada `TrailerScene` ya declara),
 *   3) los retratos de sus entidades directamente relacionadas.
 *
 * Todos síncronos a propósito: los callers existentes (`gallery.ts`,
 * `page.tsx`) los invocan sin `await`.
 */

const YOUTUBE_ID_PATTERN =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/

/** Extrae el ID de video de una URL de YouTube. Null si no matchea. */
function extractYouTubeId(url?: string): string | null {
  if (!url) return null
  const match = url.match(YOUTUBE_ID_PATTERN)
  return match ? match[1] : null
}

const CACHE_ENABLED = process.env.NODE_ENV === 'production'
let assetsCache: MediaAsset[] | null = null

/**
 * Todos los MediaAsset del sitio (hoy: un 'trailer' por cada entidad
 * Trailer que tenga `officialUrl` de YouTube reconocible). Síncrono.
 */
export function getMediaAssets(): MediaAsset[] {
  if (CACHE_ENABLED && assetsCache) return assetsCache

  const trailers = getEntitiesByTypeSync(EntityType.TRAILER) as Trailer[]
  const assets: MediaAsset[] = []

  for (const trailer of trailers) {
    const youtubeId = extractYouTubeId(trailer.officialUrl)
    if (!youtubeId) continue

    assets.push({
      id: `trailer-${trailer.slug}`,
      kind: 'trailer',
      title: trailer.title,
      description: trailer.description,
      credit: 'Rockstar Games — canal oficial de YouTube',
      tags: trailer.tags,
      status: trailer.status === 'confirmado' ? 'verified' : 'unverified',
      source: {
        provider: 'YouTube (Rockstar Games)',
        type: 'youtube',
        hotlinkNote: 'Embed oficial de YouTube — no se aloja el video en este sitio.',
      },
      youtubeId,
      relations: {
        trailer: { trailerSlug: trailer.slug },
      },
    })
  }

  if (CACHE_ENABLED) assetsCache = assets
  return assets
}

/**
 * Resuelve un MediaAsset a algo efectivamente renderizable (embed de
 * YouTube, imagen, o 'unavailable' si no hay forma de mostrarlo).
 */
export function resolveMediaRender(asset: MediaAsset): RenderableMedia {
  if (asset.youtubeId) {
    return {
      renderAs: 'youtube',
      embedId: asset.youtubeId,
      thumbnailSrc: `https://img.youtube.com/vi/${asset.youtubeId}/hqdefault.jpg`,
      title: asset.title,
    }
  }

  if (asset.imageSrc) {
    return {
      renderAs: 'image',
      thumbnailSrc: asset.imageSrc,
      title: asset.title,
    }
  }

  return {
    renderAs: 'unavailable',
    thumbnailSrc: '',
    title: asset.title,
  }
}

/**
 * Busca, entre todos los trailers, en qué escenas aparece la entidad dada
 * (por slug+tipo, vía las `relations` de cada `TrailerScene`), y devuelve
 * el asset de ese trailer (deduplicado por trailer, no por escena).
 */
function getTrailerAssetsFeaturingEntity(entity: Entity): MediaAsset[] {
  if (entity.type === EntityType.TRAILER) return []

  const trailers = getEntitiesByTypeSync(EntityType.TRAILER) as Trailer[]
  const allAssets = getMediaAssets()
  const assetBySlug = new Map(allAssets.map((a) => [a.relations?.trailer?.trailerSlug, a]))

  const matches: MediaAsset[] = []
  const seenTrailerSlugs = new Set<string>()

  for (const trailer of trailers) {
    if (seenTrailerSlugs.has(trailer.slug)) continue

    const appearsInScene = trailer.scenes.some((scene) =>
      (scene.relations || []).some(
        (rel) => rel.targetType === entity.type && rel.targetSlug === entity.slug
      )
    )

    if (appearsInScene) {
      const asset = assetBySlug.get(trailer.slug)
      if (asset) {
        matches.push(asset)
        seenTrailerSlugs.add(trailer.slug)
      }
    }
  }

  return matches
}

/**
 * Media relacionada a mostrar en la ficha de una entidad: su propio
 * retrato (si existe), los trailers donde aparece, y los retratos de sus
 * entidades directamente relacionadas. El caller (`page.tsx`) filtra el
 * retrato propio por convención de id (`entity-portrait-{type}-{slug}`)
 * para mostrar solo "lo demás" en el carrusel de contenido relacionado.
 */
export function getMediaForEntity(entity: Entity, limit = 12): MediaAsset[] {
  const items: MediaAsset[] = []

  const ownImage = resolveEntityImage(entity)
  if (ownImage) {
    items.push({
      id: `entity-portrait-${entity.type}-${entity.slug}`,
      kind: 'image',
      title: entity.title,
      description: entity.description,
      credit: entity.image?.credit || entity.image?.sourceName || 'Rockstar Games — material oficial',
      tags: entity.tags,
      source: { provider: entity.image?.sourceName || 'Material oficial', type: 'local' },
      imageSrc: ownImage.src,
      relations: { entity: { entityType: entity.type, entitySlug: entity.slug } },
    })
  }

  items.push(...getTrailerAssetsFeaturingEntity(entity))

  for (const rel of entity.relations || []) {
    if (items.length >= limit) break
    if (rel.targetType === EntityType.TRAILER) continue

    const relatedEntities = getEntitiesByTypeSync(rel.targetType)
    const target = relatedEntities.find((e) => e.slug === rel.targetSlug)
    if (!target) continue

    const targetImage = resolveEntityImage(target)
    if (!targetImage) continue

    items.push({
      id: `entity-portrait-${target.type}-${target.slug}`,
      kind: 'image',
      title: target.title,
      description: target.description,
      credit: target.image?.credit || target.image?.sourceName || 'Rockstar Games — material oficial',
      tags: target.tags,
      source: { provider: target.image?.sourceName || 'Material oficial', type: 'local' },
      imageSrc: targetImage.src,
      relations: { entity: { entityType: target.type, entitySlug: target.slug } },
    })
  }

  return items.slice(0, limit)
}
