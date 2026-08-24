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
  VEHICLE = 'vehiculos',
  NEWS = 'noticias',
  GUIDE = 'guias',
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

/**
 * Entidades sin contrato TS propio más allá de BaseEntity: noticias y
 * guías (de compra/comparativas de autos y motos). Su forma es
 * intencionalmente abierta; `GenericEntityMetadata`
 * (`src/components/entities/EntityMetadata.tsx`) renderiza sus campos
 * propios de forma data-driven a partir de las claves no reservadas por
 * `BaseEntity`.
 */
export interface GenericEntity extends BaseEntity {
  type: EntityType.NEWS | EntityType.GUIDE
  [key: string]: unknown
}

export type Entity = Vehicle | GenericEntity

export interface EntityTypeConfig {
  type: EntityType
  label: string
  labelSingular?: string
}
