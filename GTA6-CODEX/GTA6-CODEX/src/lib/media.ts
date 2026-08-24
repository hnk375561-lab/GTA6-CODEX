import fs from 'fs'
import path from 'path'
import type { Entity, Trailer } from '@/types'
import { EntityType } from '@/types'
import type { MediaAsset, RenderableMedia } from '@/types/media'
import { safeParseMediaAsset } from '@/types/schemas'
import type { ResolvedDisplayImage, ResolvedEntityImage } from './images'
import { getEntitiesByTypeSync } from './entities'
import { resolveEntityImage } from './images'

/**
 * Registro editorial de media.
 *
 * La fuente de verdad son los JSON de `src/content/media/`. Los trailers
 * antiguos siguen pudiendo derivarse desde `officialUrl` como fallback: así
 * una entidad trailer nueva no pierde reproductor antes de tener su ficha de
 * media editorial. Los clips y la portada ya no viven hardcodeados aquí.
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

function fallbackTrailerAsset(trailer: Trailer): MediaAsset | null {
  const url = trailer.officialUrl
  if (!url || !isDirectVideoUrl(url)) return null
  return {
    id: `trailer-${trailer.slug}`,
    kind: 'trailer',
    title: trailer.title,
    description: trailer.description,
    status: trailer.status === 'confirmado' ? 'verified' : 'unverified',
    credit: 'Rockstar Games — material oficial',
    source: {
      provider: 'Vercel Blob Storage',
      type: 'vercel-blob',
      originalUrl: url,
      hotlinkAllowed: true,
      hotlinkNote: 'Archivo de vídeo público ya usado por la ficha oficial del tráiler.',
      retrievedAt: trailer.updatedAt,
    },
    relations: { trailer: { trailerSlug: trailer.slug } },
    createdAt: trailer.createdAt,
    updatedAt: trailer.updatedAt,
  }
}

/** Todos los assets editoriales, más fallback compatible para trailers sin ficha media. */
export function getMediaAssets(): MediaAsset[] {
  const editorial = readEditorialMedia()
  const trailerSlugs = new Set(
    editorial.flatMap((asset) => (asset.relations?.trailer ? [asset.relations.trailer.trailerSlug] : []))
  )
  const fallback = (getEntitiesByTypeSync(EntityType.TRAILER) as Trailer[])
    .filter((trailer) => !trailerSlugs.has(trailer.slug))
    .map(fallbackTrailerAsset)
    .filter((asset): asset is MediaAsset => asset !== null)

  return [...editorial, ...fallback]
}

export function getMediaForTrailer(trailerSlug: string): MediaAsset | null {
  return getMediaAssets().find((asset) => asset.relations?.trailer?.trailerSlug === trailerSlug) || null
}

export function getCoverArtVideoAsset(): MediaAsset | null {
  return getMediaAssets().find((asset) => asset.tags?.includes('cover-art')) || null
}

export function resolveTrailerThumbnail(trailer: Trailer): { src: string; alt: string } | null {
  const asset = getMediaForTrailer(trailer.slug)
  const rendered = asset ? resolveMediaRender(asset) : null
  if (!rendered || rendered.renderAs !== 'youtube' || !rendered.thumbnailSrc) return null
  return { src: rendered.thumbnailSrc, alt: trailer.title }
}

/** Server-only: resuelve archivos locales antes de serializar props a clientes. */
export function resolveEntityDisplayImage(entity: Entity): ResolvedDisplayImage | null {
  const local = resolveEntityImage(entity)
  if (local) return { src: local.src, alt: local.alt, remote: false }

  if (entity.type === EntityType.TRAILER) {
    const remote = resolveTrailerThumbnail(entity as Trailer)
    if (remote) return { ...remote, remote: true }
  }
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

function trailerFeaturesEntity(asset: MediaAsset, entity: Entity): boolean {
  const trailerSlug = asset.relations?.trailer?.trailerSlug
  if (!trailerSlug) return false
  const trailer = (getEntitiesByTypeSync(EntityType.TRAILER) as Trailer[]).find((item) => item.slug === trailerSlug)
  if (!trailer) return false

  const sceneId = asset.relations?.trailer?.sceneId
  const scenes = sceneId ? trailer.scenes.filter((scene) => scene.id === sceneId) : trailer.scenes
  return scenes.some((scene) =>
    (scene.relations || []).some(
      (relation) => relation.targetType === entity.type && relation.targetSlug === entity.slug
    )
  )
}

/** Assets editoriales vinculados de forma explícita o por escenas de trailer. */
export function getEditorialMediaForEntity(entity: Entity, limit = 12): MediaAsset[] {
  const seen = new Set<string>()
  return getMediaAssets()
    .filter((asset) => hasEntityRelation(asset, entity) || trailerFeaturesEntity(asset, entity))
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

export function getCharacterClipUrl(entitySlug: string): string | null {
  const clip = getMediaAssets().find(
    (asset) => asset.kind === 'clip' && (asset.relations?.entities || []).some(
      (relation) => relation.entityType === EntityType.CHARACTER && relation.entitySlug === entitySlug
    )
  )
  const rendered = clip ? resolveMediaRender(clip) : null
  return rendered?.renderAs === 'video' ? rendered.videoSrc || null : null
}
