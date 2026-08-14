/**
 * TIPOS CENTRALES DE GTAS CODEX
 * 
 * Estos tipos definen el contrato fundamental para todas las entidades.
 * El sistema es genérico + configurable por tipo.
 */

/**
 * Estados posibles de información
 * - confirmado: Información oficial/verificada
 * - rumor: Especulación/no confirmado
 * - nuestro: Teoría/análisis propio del sitio
 * 
 * Extensible: nuevos estados pueden agregarse sin romper el modelo
 */
export type InformationStatus = 'confirmado' | 'rumor' | 'nuestro'

/**
 * Tipos de entidad soportados
 * Este enum es exhaustivo pero extensible
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
}

/**
 * Interfaz base para todas las entidades
 * Toda entidad debe cumplir con este contrato mínimo
 */
export interface BaseEntity {
  // Identificación
  slug: string // URL-safe identifier, debe ser único por tipo
  type: EntityType
  
  // Contenido
  title: string
  description: string // Resumen corto
  content?: string // Contenido principal (opcional en fase 1)
  
  // Metadata
  status: InformationStatus
  tags?: string[]
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  
  // Relaciones
  relations?: EntityRelation[]
  
  // SEO
  seoTitle?: string // Sobrescribe title si está presente
  seoDescription?: string // Sobrescribe description si está presente
  featured?: boolean // Si debe aparecer en secciones destacadas

  /**
   * Trazabilidad de evidencia (opcional).
   * Complementa a `status` con un nivel de certeza más granular,
   * pensado inicialmente para entidades identificadas visualmente
   * (ej. vehículos) donde "confirmado" puede significar cosas distintas:
   * un nombre publicado oficialmente por Rockstar no es lo mismo que
   * una identificación visual respaldada por fuentes especializadas.
   */
  evidence?: {
    // Nivel de certeza de la identificación
    level: 'oficial-nombrado' | 'oficial-visual' | 'respaldado' | 'especulativo'
    // Fuente primaria: Rockstar Games, sitio oficial, trailer, comunicado, etc.
    primarySource?: string
    // Fuente secundaria usada para ayudar a identificar (nunca autoridad canónica)
    secondarySource?: string
    // Aclaración libre sobre qué está y qué no está confirmado
    note?: string
    // Limitaciones conocidas de la identificación/relación documentada,
    // una por punto (ej. datos no verificables, contaminación cruzada
    // detectada, ambigüedad no resuelta)
    limitations?: string[]
  }
}

/**
 * Relación entre entidades
 * Define conexiones significativas
 */
export interface EntityRelation {
  targetType: EntityType
  targetSlug: string
  relation: string // ej: "aparece en", "conducido por", "ubicado en", etc.
  direction?: 'to' | 'from' | 'bidirectional' // Por defecto 'to'
}

/**
 * Entidad específica de personaje
 * Extiende BaseEntity con propiedades específicas
 */
export interface Character extends BaseEntity {
  type: EntityType.CHARACTER
  
  // Propiedades específicas
  alias?: string[] // Alias o nombres alternativos
  faction?: string // Facción/organización principal
  voice_actor?: string
  appearance?: {
    age?: string
    height?: string
    build?: string
    characteristics?: string
  }
}

/**
 * Entidad específica de vehículo
 */
export interface Vehicle extends BaseEntity {
  type: EntityType.VEHICLE
  
  // Propiedades específicas
  manufacturer?: string
  class?: string // sports, sedan, truck, etc.
  driven_by?: string[] // Personajes que lo conducen
  locations?: string[] // Dónde aparece
  customizable?: boolean
  performance?: {
    speed?: string
    acceleration?: string
    handling?: string
    braking?: string
  }
}

/**
 * Entidad específica de ubicación
 */
export interface Location extends BaseEntity {
  type: EntityType.LOCATION
  
  // Propiedades específicas
  district?: string // Distrito/zona
  region?: string // Región más amplia
  coordinates?: {
    x: number
    y: number
  }
  points_of_interest?: string[] // Lugares notables dentro
  missions?: string[] // Misiones que ocurren aquí
  businesses?: string[] // Negocios ubicados aquí
}

/**
 * Entidad específica de misión
 */
export interface Mission extends BaseEntity {
  type: EntityType.MISSION
  
  // Propiedades específicas
  giver?: string // Quién da la misión
  mission_type?: string // Misión principal, side quest, etc.
  reward?: string
  objectives?: string[]
  location?: string
  characters_involved?: string[]
  prerequisite?: string // Misión prerequisita
}

/**
 * Entidad genérica para tipos no tan complejos
 */
export interface GenericEntity extends BaseEntity {
  type: Exclude<EntityType, EntityType.CHARACTER | EntityType.VEHICLE | EntityType.LOCATION | EntityType.MISSION>
  
  // Propiedades personalizadas según tipo
  [key: string]: unknown
}

/**
 * Union de todos los tipos de entidad
 */
export type Entity = Character | Vehicle | Location | Mission | GenericEntity

/**
 * Meta información sobre un tipo de entidad
 * Define configuración específica del tipo
 */
export interface EntityTypeConfig {
  type: EntityType
  singular: string
  plural: string
  description: string
  icon?: string
  color?: string
  defaultStatus?: InformationStatus
}
