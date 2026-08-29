import fs from 'fs'
import path from 'path'
import type { Entity } from '@/types'
import type { MediaAsset, RenderableMedia } from '@/types/media'
import { safeParseMediaAsset } from '@/types/schemas'
import type { ResolvedDisplayImage, ResolvedEntityImage } from './images'
import { getEntitiesByTypeSync } from './entities'
import { resolveEntityImage } from './images'

/**
 * Registro editorial de media.
 *
 * La fuente de verdad son los JSON de `src/content/media/`. El pivote a
 * AutoFicha eliminó el tipo de entidad `Trailer` y todo el contenido de
 * trailers/tráilers; este registro ya no necesita fallback ni relaciones
 * especiales para ese tipo.
 */
const MEDIA_DIR = path.join(process.cwd(), 'src', 'content', 'media')
const CACHE_ENABLED = process.env.NODE_ENV === 'production'
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
  if (CACHE_ENABLED && mediaCache) return mediaCache
  if (!fs.existsSync(MEDIA_DIR)) return []

  const seenIds = new Set<string>()
  const assets: MediaAsset[] = []

  for (const file of fs.readdirSync(MEDIA_DIR).filter((name) => name.endsWith('.json')).sort()) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(path.join(MEDIA_DIR, file), 'utf8'))
      const result = safeParseMediaAsset(parsed)
      if (!result.success) {
        console.warn(`[media] Asset inválido ignorado: media/${file}: ${result.error.message}`)
        continue
      }
      const asset = result.data as MediaAsset
      const expectedId = file.replace(/\.json$/, '')
      if (asset.id !== expectedId || seenIds.has(asset.id)) {
        console.warn(`[media] Asset ignorado por id inválido o duplicado: media/${file}`)
        continue
      }
      seenIds.add(asset.id)
      assets.push(asset)
    } catch (error) {
      console.warn(`[media] Error leyendo media/${file}:`, error)
    }
  }

  if (CACHE_ENABLED) mediaCache = assets
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
