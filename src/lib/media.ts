import type { Entity } from '@/types'
import type { MediaAsset, RenderableMedia } from '@/types/media'
import { safeParseMediaAsset } from '@/types/schemas'
import type { ResolvedDisplayImage, ResolvedEntityImage } from './images'
import { getEntitiesByTypeSync } from './entities'
import { resolveEntityImage, resolveEntityImages } from './images'
import { CONTENT_BUNDLE } from './generated/content-bundle'

/**
 * Registro editorial de media.
 *
 * La fuente de verdad son los datos de `src/content/media/` embebidos en el
 * bundle (generado en build time). Sin I/O de runtime, cero CPU timeout.
 */
let mediaCache: MediaAsset[] | null = null

function isDirectVideoUrl(url?: string): url is string {
  if (!url) return false
  try {
    return /\.mp4$/i.test(new URL(url).pathname)
  } catch {
    return false
  }
}

function readEditorialMedia(): MediaAsset[] {
  if (mediaCache) return mediaCache

  const seenIds = new Set<string>()
  const assets: MediaAsset[] = []
  const raw = CONTENT_BUNDLE.media ?? []

  for (const parsed of raw) {
    try {
      const result = safeParseMediaAsset(parsed)
      if (!result.success) {
        console.warn(`[media] Asset inválido ignorado: ${parsed.id}: ${result.error.message}`)
        continue
      }
      const asset = result.data as MediaAsset
      if (seenIds.has(asset.id)) {
        console.warn(`[media] Asset ignorado por id duplicado: ${asset.id}`)
        continue
      }
      seenIds.add(asset.id)
      assets.push(asset)
    } catch (error) {
      console.warn(`[media] Error procesando media asset:`, error)
    }
  }

  mediaCache = assets
  return assets
}

/** Útil para tests y scripts que necesitan releer el registro en el proceso actual. */
export function clearMediaCache(): void {
  mediaCache = null
}

/** Todos los assets editoriales registrados en `src/content/media/`. */
export function getMediaAssets(): MediaAsset[] {
  return readEditorialMedia()
}

export function getCoverArtVideoAsset(): MediaAsset | null {
  return getMediaAssets().find((asset) => asset.tags?.includes('cover-art')) || null
}

/** Server-only: resuelve archivos locales antes de serializar props a clientes. */
export function resolveEntityDisplayImage(entity: Entity): ResolvedDisplayImage | null {
  const local = resolveEntityImage(entity)
  if (local) return { src: local.src, alt: local.alt, remote: false }
  return null
}

/**
 * Server-only, plural: todas las imágenes locales resueltas para la
 * entidad (principal + `-2`, `-3`, ... si existen), ya serializadas para
 * pasar como prop a un componente cliente (mismo motivo que
 * `resolveEntityDisplayImage`: el cliente no tiene `fs`).
 *
 * Devuelve `[]` para las entidades con 0 o 1 imagen — el caller (la
 * página de ficha) es quien decide si con 1 sola imagen alcanza con el
 * `EntityImage` de siempre (sin cambios de comportamiento) o si con 2+
 * vale la pena montar la galería nueva. Ver `EntityGallery`.
 */
export function resolveEntityDisplayImages(entity: Entity): ResolvedDisplayImage[] {
  return resolveEntityImages(entity).map((img) => ({ src: img.src, alt: img.alt, remote: false }))
}

/** La clave incluye tipo para que el mapa sea seguro en colecciones globales. */
export function getEntityImageMap(entities: Entity[]): Record<string, ResolvedDisplayImage | null> {
  return Object.fromEntries(entities.map((entity) => [`${entity.type}/${entity.slug}`, resolveEntityDisplayImage(entity)]))
}

export function resolveMediaRender(asset: MediaAsset): RenderableMedia {
  const { source } = asset
  if (source.type === 'youtube' && source.embedId) {
    return {
      renderAs: 'youtube',
      embedId: source.embedId,
      thumbnailSrc: `https://img.youtube.com/vi/${source.embedId}/hqdefault.jpg`,
      title: asset.title,
    }
  }
  if (source.type === 'local' && source.localPath) {
    return { renderAs: 'image', thumbnailSrc: source.localPath, title: asset.title }
  }
  if (isDirectVideoUrl(source.originalUrl) && source.hotlinkAllowed) {
    return { renderAs: 'video', videoSrc: source.originalUrl, thumbnailSrc: asset.posterUrl || '', title: asset.title }
  }
  return { renderAs: 'unavailable', thumbnailSrc: '', title: asset.title }
}

function hasEntityRelation(asset: MediaAsset, entity: Entity): boolean {
  return (asset.relations?.entities || []).some(
    (relation) => relation.entityType === entity.type && relation.entitySlug === entity.slug
  )
}

/** Assets editoriales vinculados de forma explícita a la entidad. */
export function getEditorialMediaForEntity(entity: Entity, limit = 12): MediaAsset[] {
  const seen = new Set<string>()
  return getMediaAssets()
    .filter((asset) => hasEntityRelation(asset, entity))
    .filter((asset) => (seen.has(asset.id) ? false : (seen.add(asset.id), true)))
    .slice(0, limit)
}

/**
 * Construye el `MediaAsset` de "retrato" a partir de una entidad y su
 * imagen local ya resuelta. Compartido entre el retrato de la entidad
 * principal y los retratos de sus entidades relacionadas en
 * `getMediaForEntity`, que antes duplicaban este mismo objeto letra por
 * letra salvo por `role` (retrato vs. relacionado).
 */
function buildPortraitAsset(entity: Entity, image: ResolvedEntityImage, role: 'retrato' | 'relacionado'): MediaAsset {
  return {
    id: `entity-portrait-${entity.type}-${entity.slug}`,
    kind: 'image',
    title: entity.title,
    description: entity.description,
    status: entity.status === 'confirmado' ? 'verified' : 'unverified',
    credit: entity.image?.credit || entity.image?.sourceName || 'Material de entidad',
    source: { provider: 'Archivo local', type: 'local', localPath: image.src, retrievedAt: entity.updatedAt },
    relations: { entities: [{ entityType: entity.type, entitySlug: entity.slug, role }] },
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}

/** Media de ficha: retrato local, assets editoriales y retratos relacionados. */
export function getMediaForEntity(entity: Entity, limit = 12): MediaAsset[] {
  const items: MediaAsset[] = []
  const image = resolveEntityImage(entity)
  if (image) {
    items.push(buildPortraitAsset(entity, image, 'retrato'))
  }

  items.push(...getEditorialMediaForEntity(entity, limit))

  for (const relation of entity.relations || []) {
    if (items.length >= limit) break
    const target = getEntitiesByTypeSync(relation.targetType).find((item) => item.slug === relation.targetSlug)
    const targetImage = target && resolveEntityImage(target)
    if (!target || !targetImage) continue
    items.push(buildPortraitAsset(target, targetImage, 'relacionado'))
  }
  return items.slice(0, limit)
}
