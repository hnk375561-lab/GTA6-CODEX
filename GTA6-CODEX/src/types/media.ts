import type { EntityType } from './entity'

/**
 * TIPOS DEL SISTEMA DE MEDIA (video / trailers)
 * ================================================
 *
 * Este archivo faltaba en el repo original: `src/lib/gallery.ts`,
 * `src/app/[entityType]/[slug]/page.tsx` y `src/types/index.ts` ya
 * importaban `MediaAsset`, `RenderableMedia`, etc. desde `./media`
 * (`@/types/media`), pero el módulo nunca existía en el árbol de
 * archivos ni en el historial de git — el proyecto no podía compilar
 * (`next build` fallaba con "Cannot find module './media'").
 *
 * Se reconstruyen acá los contratos exactos que ya esperaban los
 * consumidores existentes (inferidos de su uso real en gallery.ts):
 * `kind`, `relations.trailer.trailerSlug`, `credit`, `source.provider`,
 * `source.hotlinkNote`, y el resultado de resolución con
 * `renderAs / embedId / thumbnailSrc / title`.
 */

/** Tipo de asset de media. Hoy solo se generan 'trailer' (ver lib/media.ts),
 *  pero se deja 'video' e 'image' para material que se agregue a mano más
 *  adelante sin romper el contrato. */
export type MediaKind = 'trailer' | 'video' | 'image'

/** De dónde viene el asset. 'youtube' es embed; 'vercel-blob' es un archivo
 *  de video servido directamente (mp4) desde Vercel Blob Storage, hotlinkeado
 *  por URL pública — mismo criterio de "no alojar en el repo" que ya usa
 *  'youtube', pero sin proveedor de embed intermedio. */
export type MediaSourceType = 'youtube' | 'vercel-blob' | 'official-site' | 'local'

/** Nivel de verificación de la procedencia del asset — mismo espíritu que
 *  `evidence.level` en BaseEntity, pero acotado al material audiovisual. */
export type MediaValidationStatus = 'verified' | 'unverified'

export interface MediaSource {
  /** Nombre legible del proveedor/fuente, ej. "Rockstar Games (YouTube oficial)". */
  provider: string
  type: MediaSourceType
  /** Nota de hotlink/licencia a mostrar junto al crédito, si aplica. */
  hotlinkNote?: string
}

/** Vínculo de un asset con una entidad puntual (no un trailer). */
export interface MediaEntityRelation {
  entityType: EntityType
  entitySlug: string
}

/** Vínculo de un asset con un trailer y, opcionalmente, una escena puntual. */
export interface MediaTrailerRelation {
  trailerSlug: string
  sceneId?: string
}

export interface MediaAsset {
  /** Id estable, usado como key de UI y para filtrar (ver page.tsx). */
  id: string
  kind: MediaKind
  title: string
  description?: string
  /** Crédito visible en la UI (galería, carrusel). */
  credit?: string
  tags?: string[]
  status?: MediaValidationStatus
  source: MediaSource
  /** Id de video de YouTube, si el asset es reproducible como embed. */
  youtubeId?: string
  /** URL pública y directa de un archivo de video (mp4), para assets sin
   *  proveedor de embed — hoy, clips y tráilers alojados en Vercel Blob. */
  videoSrc?: string
  /** Ruta pública de imagen, para assets tipo 'image'. */
  imageSrc?: string
  relations?: {
    trailer?: MediaTrailerRelation
    entity?: MediaEntityRelation
  }
}

/** Resultado de resolver un MediaAsset a algo efectivamente renderizable. */
export interface RenderableMedia {
  renderAs: 'youtube' | 'video' | 'image' | 'unavailable'
  /** Id de embed de YouTube — solo si renderAs === 'youtube'. */
  embedId?: string
  /** URL directa del archivo mp4 — solo si renderAs === 'video'. */
  videoSrc?: string
  /** Miniatura a mostrar en galería/carrusel/lightbox. Vacía para 'video'
   *  directo: no hay miniatura estática generada, el propio <video> resuelve
   *  su primer frame vía `preload="metadata"`. */
  thumbnailSrc: string
  title: string
}
