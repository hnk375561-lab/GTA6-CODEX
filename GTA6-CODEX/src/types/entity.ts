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

/** Bloques de especificación técnica "clave: valor" libre (motor,
 *  transmisión, suspensión, ruedas, dirección). Se modelan como diccionario
 *  abierto porque las claves varían levemente entre combustión/eléctrico/
 *  moto (ver auditoría), y forzar una forma fija perdería datos reales. */
export type SpecBlock = Record<string, string | number | null | undefined>

export interface VehicleSafety {
  euroNCAP?: string
  puntaje?: number
}

export interface VehicleRegionAvailability {
  disponible?: boolean
  mercados?: string[]
  precioBase?: string
}

export interface VehicleAvailability {
  europa?: VehicleRegionAvailability
  americas?: VehicleRegionAvailability
  asia?: VehicleRegionAvailability
}

export interface VehicleVariant {
  nombre?: string
  precio?: string
}

export interface VehicleCompetition {
  competidores?: string[]
  posicionMercado?: string
  ventajas?: string[]
}

export interface Vehicle extends BaseEntity {
  type: EntityType.VEHICLE
  manufacturer?: string
  class?: string
  driven_by?: string[]
  locations?: string[]
  customizable?: boolean
  /** Texto libre tipo "255 hp" o "200 hp (2.0 TFSI base)". Siempre
   *  presente en el contenido real (250/250 fichas a la fecha), pero
   *  sigue siendo texto libre — ver `parsePowerHp` en
   *  `@/lib/vehicle-power.ts` para extraer el número de forma segura en
   *  vez de castear/parsear en cada lugar que lo necesite. */
  power?: string
  performance?: {
    speed?: string
    acceleration?: string
    handling?: string
    braking?: string
  }

  // --- Campos reales del contenido, poblados en ~250/250 fichas pero
  // hasta ahora ausentes de este contrato (ver auditoría "AutoFicha:
  // aprovechamiento de datos", sección 4). Todos opcionales y de solo
  // lectura de contenido existente — no se inventa ningún dato acá.
  price?: string | null
  consumo?: string | null
  dimensiones?: string | null
  transmision?: string | null
  traccion?: string | null
  peso?: string | null
  tipoMotor?: string | null
  potenciaKW?: string | null
  capacidadTanque?: string | null
  tiempoRecorrido?: string | null
  anoProduccion?: string | null
  mercados?: string[] | null
  equipamiento?: string[] | null
  consumoEtiqueta?: string | null
  neumaticos?: string | null
  cilindrada?: string | null
  asientos?: number | string | null
  baul?: number | string | null
  maleteroMin?: number | string | null
  generacion?: string | null
  /** Ver comentario en schemas.ts: extracción best-effort de `generacion`,
   *  aditiva y nunca destructiva del string original. */
  generacionInfo?: {
    raw: string
    numero: number | null
    codigoChasis: string | null
    anoInicio: number | null
    anoFin: number | null
    rangoAbierto: boolean
    facelift: boolean
    faceliftAno: number | null
  } | null
  anoLanzamiento?: number | string | null
  colores?: string[] | null

  especificacionesMotor?: SpecBlock | null
  especificacionesTransmision?: SpecBlock | null
  especificacionesSuspension?: SpecBlock | null
  especificacionesRuedas?: SpecBlock | null
  especificacionesDireccion?: SpecBlock | null

  /** Poblado en 155/250 fichas — cualquier UI que lo consuma debe tratarlo
   *  como opcional/condicional, igual que ya hace el resto del sitio con
   *  cobertura parcial. */
  safety?: VehicleSafety
  /** Poblado en 155/250 fichas, con precio real por región. */
  availability?: VehicleAvailability

  variants?: VehicleVariant[]
  competition?: VehicleCompetition
  relatedModels?: {
    anterior?: string | null
    siguiente?: string | null
    hermanos?: string[]
    competidores?: string[]
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
