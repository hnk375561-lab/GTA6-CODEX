import type { EntityType } from './entity'

/** Assets editoriales en `src/content/media/*.json`. No son entidades: no
 * generan URL propia, pero se vinculan a entidades y escenas existentes. */
export type MediaKind = 'image' | 'video' | 'trailer' | 'clip' | 'artwork'
export type MediaSourceType = 'youtube' | 'vercel-blob' | 'official-site' | 'local'
export type MediaValidationStatus = 'verified' | 'unverified'

export interface MediaSource {
  provider: string
  type: MediaSourceType
  originalUrl?: string
  localPath?: string
  embedId?: string
  hotlinkAllowed?: boolean
  hotlinkNote?: string
  retrievedAt: string
}

export interface MediaEntityRelation {
  entityType: EntityType
  entitySlug: string
  role?: string
}

export interface MediaTrailerRelation {
  trailerSlug: string
  sceneId?: string
}

export interface MediaAsset {
  id: string
  kind: MediaKind
  title: string
  description?: string
  source: MediaSource
  width?: number
  height?: number
  duration?: number
  tags?: string[]
  status: MediaValidationStatus
  duplicateOf?: string
  relations?: {
    entities?: MediaEntityRelation[]
    trailer?: MediaTrailerRelation
  }
  credit?: string
  createdAt: string
  updatedAt: string
}

export interface RenderableMedia {
  renderAs: 'youtube' | 'video' | 'image' | 'unavailable'
  embedId?: string
  videoSrc?: string
  thumbnailSrc: string
  title: string
}
