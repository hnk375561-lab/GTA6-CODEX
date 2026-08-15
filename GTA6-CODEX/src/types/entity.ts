/**
 * Contratos de tipos para todas las entidades del sitio.
 *
 * Este archivo solo define tipos/enums (sin lógica de runtime). La lógica
 * de lectura/validación/caché de contenido vive en `src/lib/entities.ts`,
 * que consume estos tipos.
 *
 * Los schemas de Zod en `src/types/schemas.ts` reflejan estos mismos
 * contratos para poder validar en runtime el JSON en disco (que no pasa
 * por el compilador de TypeScript).
 */

export enum EntityType {
  CHARACTER = 'personajes',
  VEHICLE = 'vehiculos',
  LOCATION = 'ubicaciones',
  MISSION = 'misiones',
  WEAPON = 'armas',
  ACTIVITY = 'actividades',
  FACTION = 'organizaciones',
  BUSINESS = 'negocios',
  OBJECT = 'objetos',
  NEWS = 'noticias',
  GUIDE = 'guias',
  TRAILER = 'trailers',
}

export type InformationStatus = 'confirmado' | 'rumor' | 'nuestro'

export interface EntityRelation {
  targetType: EntityType
  targetSlug: string
  relation: string
  direction?: 'to' | 'from' | 'bidirectional'
}

export interface Evidence {
  level:
    | 'oficial-nombrado'
    | 'oficial-visual'
    | 'oficial-visual-multifuente'
    | 'respaldado'
    | 'especulativo'
  primarySource?: string
  secondarySource?: string
  note?: string
  limitations?: string[]
}

export interface ImageProvenance {
  source: 'official' | 'secondary' | 'unverified'
  sourceName?: string
  sourceUrl?: string
  retrievedAt?: string
  credit?: string
  alt?: string
}

/**
 * Contrato base compartido por toda entidad, sin importar su tipo específico.
 */
export interface BaseEntity {
  slug: string
  type: EntityType
  title: string
  description: string
  content?: string
  status: InformationStatus
  tags?: string[]
  createdAt: string
  updatedAt: string
  relations?: EntityRelation[]
  seoTitle?: string
  seoDescription?: string
  featured?: boolean
  evidence?: Evidence
  image?: ImageProvenance
}

export interface Character extends BaseEntity {
  type: EntityType.CHARACTER
  alias?: string[]
  faction?: string | null
  voice_actor?: string
  appearance?: {
    age?: string
    height?: string
    build?: string
    characteristics?: string
  }
}

export interface Vehicle extends BaseEntity {
  type: EntityType.VEHICLE
  manufacturer?: string
  class?: string
  driven_by?: string[]
  locations?: string[]
  customizable?: boolean
  performance?: {
    speed?: string
    acceleration?: string
    handling?: string
    braking?: string
  }
}

export interface Location extends BaseEntity {
  type: EntityType.LOCATION
  district?: string | null
  region?: string | null
  coordinates?: { x: number; y: number }
  points_of_interest?: string[]
  missions?: string[]
  businesses?: string[]
  environment?: {
    climate?: string
    fauna?: string[]
    naturalEvents?: string[]
    unconfirmedNote?: string
  }
}

export interface Mission extends BaseEntity {
  type: EntityType.MISSION
  giver?: string
  mission_type?: string
  reward?: string
  objectives?: string[]
  location?: string
  characters_involved?: string[]
  prerequisite?: string
}

export interface TrailerScene {
  id: string
  timestamp: string
  title: string
  description: string
  relations?: EntityRelation[]
  status?: InformationStatus
}

export interface Trailer extends BaseEntity {
  type: EntityType.TRAILER
  releaseDate: string
  officialUrl?: string
  durationSeconds?: number
  scenes: TrailerScene[]
}

/**
 * Entidades sin contrato TS propio más allá de BaseEntity: armas,
 * actividades, organizaciones, negocios, objetos, noticias, guías.
 * Su forma es intencionalmente abierta; `GenericEntityMetadata`
 * (`src/components/entities/EntityMetadata.tsx`) renderiza sus campos
 * propios de forma data-driven a partir de las claves no reservadas por
 * `BaseEntity`.
 */
export interface GenericEntity extends BaseEntity {
  type:
    | EntityType.WEAPON
    | EntityType.ACTIVITY
    | EntityType.FACTION
    | EntityType.BUSINESS
    | EntityType.OBJECT
    | EntityType.NEWS
    | EntityType.GUIDE
  [key: string]: unknown
}

export type Entity = Character | Vehicle | Location | Mission | Trailer | GenericEntity

export interface EntityTypeConfig {
  type: EntityType
  label: string
  labelSingular?: string
}
