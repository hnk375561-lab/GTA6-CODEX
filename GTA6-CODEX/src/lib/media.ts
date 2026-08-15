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

/** Reconoce una URL de archivo de video directo (mp4) sin importar el host
 *  ni el query string — hoy usado para los assets alojados en Vercel Blob
 *  Storage (`*.public.blob.vercel-storage.com`), pero no se ata el patrón a
 *  ese host: cualquier URL https que termine en `.mp4` sirve como fuente
 *  reproducible directa. */
function isDirectVideoUrl(url?: string): url is string {
  if (!url) return false
  try {
    const { pathname } = new URL(url)
    return /\.mp4$/i.test(pathname)
  } catch {
    return false
  }
}

/**
 * Miniatura de un trailer para usarla como imagen de card (EntityImage).
 * Los trailers no tienen archivo local en `public/images/entities/trailers/`
 * (no hay key art propia todavía) — en vez de dejar la card sin imagen,
 * se reutiliza la miniatura pública de YouTube (mismo host que ya usa
 * `resolveMediaRender`/`GalleryExplorer` para el embed: `img.youtube.com`,
 * no se aloja el archivo en el repo). Devuelve null si el trailer no tiene
 * una URL de YouTube reconocible, y el caller cae al fallback genérico.
 */
export function resolveTrailerThumbnail(trailer: Trailer): { src: string; alt: string } | null {
  const youtubeId = extractYouTubeId(trailer.officialUrl)
  if (!youtubeId) return null
  return {
    src: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    alt: trailer.title,
  }
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

    if (youtubeId) {
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
      continue
    }

    // Sin ID de YouTube reconocible: si `officialUrl` es un archivo de
    // video directo (mp4), se arma un MediaAsset reproducible vía <video>
    // nativo en vez de descartar el trailer. No se hotlinkea el archivo
    // en el repo: la URL pública queda tal cual llegó (Vercel Blob).
    if (isDirectVideoUrl(trailer.officialUrl)) {
      assets.push({
        id: `trailer-${trailer.slug}`,
        kind: 'trailer',
        title: trailer.title,
        description: trailer.description,
        credit: 'Rockstar Games — material oficial',
        tags: trailer.tags,
        status: trailer.status === 'confirmado' ? 'verified' : 'unverified',
        source: {
          provider: 'Vercel Blob Storage',
          type: 'vercel-blob',
          hotlinkNote: 'Archivo de video servido directamente por URL pública — no se aloja en este repositorio.',
        },
        videoSrc: trailer.officialUrl,
        relations: {
          trailer: { trailerSlug: trailer.slug },
        },
      })
    }
  }

  assets.push(...getCharacterClipAssets())

  if (CACHE_ENABLED) assetsCache = assets
  return assets
}

/**
 * REGISTRO DE CLIPS DE PERSONAJE (Vercel Blob)
 * ================================================
 * Clips cortos de presentación de personaje, hotlinkeados por URL pública
 * de Vercel Blob (no se descargan ni se alojan en el repo). Mismo criterio
 * que `KEY_ART` en `lib/gallery.ts`: un registro chico y explícito en código
 * en vez de inventar un nuevo tipo de contenido en `src/content/`, porque
 * `Character` (`types/entity.ts`) no modela video y estos clips no son
 * escenas de trailer (no tienen `TrailerScene` asociada). Cada entrada se
 * ata a un personaje ya existente por `entitySlug`; si el slug no matchea
 * ninguna entidad real, `getMediaForEntity` simplemente no la muestra.
 */
const CHARACTER_CLIPS: ReadonlyArray<{ entitySlug: string; title: string; url: string }> = [
  {
    entitySlug: 'boobie-ike',
    title: 'Boobie Ike — clip de presentación',
    url: 'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/Boobie_Ike_Video_Clip.mp4',
  },
  {
    entitySlug: 'brian-heder',
    title: 'Brian Heder — clip de presentación',
    url: 'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/Brian_Heder_Video_Clip.mp4',
  },
  {
    entitySlug: 'cal-hampton',
    title: 'Cal Hampton — clip de presentación',
    url: 'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/Cal_Hampton_Video_Clip.mp4',
  },
  {
    entitySlug: 'drequan-priest',
    title: "Dre'Quan Priest — clip de presentación",
    url: 'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/DreQuan_Priest_Video_Clip.mp4',
  },
  {
    entitySlug: 'jason-duval',
    title: 'Jason Duval — clip de presentación',
    url: 'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/Jason_Duval_Video_Clip.mp4',
  },
  {
    entitySlug: 'lucia-caminos',
    title: 'Lucia Caminos — clip de presentación',
    url: 'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/Lucia_Caminos_Video_Clip.mp4',
  },
  {
    entitySlug: 'raul-bautista',
    title: 'Raul Bautista — clip de presentación',
    url: 'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/Raul_Bautista_Video_Clip.mp4',
  },
  {
    entitySlug: 'real-dimez',
    title: 'Real Dimez — clip de presentación',
    url: 'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/Real_Dimez_Video_Clip.mp4',
  },
]

/** MediaAsset de kind 'video' por cada clip de personaje registrado arriba. */
function getCharacterClipAssets(): MediaAsset[] {
  return CHARACTER_CLIPS.map((clip) => ({
    id: `clip-${clip.entitySlug}`,
    kind: 'video',
    title: clip.title,
    credit: 'Rockstar Games — material oficial',
    status: 'unverified',
    source: {
      provider: 'Vercel Blob Storage',
      type: 'vercel-blob',
      hotlinkNote: 'Archivo de video servido directamente por URL pública — no se aloja en este repositorio.',
    },
    videoSrc: clip.url,
    relations: {
      entity: { entityType: EntityType.CHARACTER, entitySlug: clip.entitySlug },
    },
  }))
}

/**
 * Video de key art / portada oficial (formato horizontal), alojado en
 * Vercel Blob. No pertenece a ningún personaje ni trailer puntual — mismo
 * espíritu que `KEY_ART` en `gallery.ts`, pero en video. Se expone aparte
 * (no vive en `getMediaAssets`) porque no es "media relacionada" de ninguna
 * entidad ni un trailer con escenas: es la pieza de portada del sitio.
 */
export function getCoverArtVideoAsset(): MediaAsset {
  return {
    id: 'video-cover-art-landscape',
    kind: 'video',
    title: 'Grand Theft Auto VI — portada oficial (video)',
    description: 'Pieza de portada oficial de Grand Theft Auto VI en formato horizontal.',
    credit: 'Rockstar Games — material oficial',
    status: 'verified',
    source: {
      provider: 'Vercel Blob Storage',
      type: 'vercel-blob',
      hotlinkNote: 'Archivo de video servido directamente por URL pública — no se aloja en este repositorio.',
    },
    videoSrc:
      'https://s3chif0bjki32ktf.public.blob.vercel-storage.com/GTA6%20MEDIA/GTAVI_Official_Cover_Art_Landscape.mp4',
  }
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

  if (asset.videoSrc) {
    return {
      renderAs: 'video',
      videoSrc: asset.videoSrc,
      // Sin miniatura estática: el <video> nativo resuelve su propio primer
      // frame vía `preload="metadata"` (ver VideoEmbed.tsx).
      thumbnailSrc: '',
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

  if (entity.type === EntityType.CHARACTER) {
    const clip = getCharacterClipAssets().find(
      (asset) => asset.relations?.entity?.entitySlug === entity.slug
    )
    if (clip) items.push(clip)
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
