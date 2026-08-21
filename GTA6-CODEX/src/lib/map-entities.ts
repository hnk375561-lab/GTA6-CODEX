/**
 * Configuración de categorías para el mapa interactivo de Leonida y
 * resolución de zona para entidades que NO son de tipo `ubicaciones`
 * (armas, vehículos, misiones, objetos).
 *
 * El mapa histórico solo mostraba `ubicaciones`, que ya vienen pre-asignadas
 * a una zona en `leonida-zones.ts` (`locationSlugs`). Para el resto de
 * entidades no hay asignación directa a zona: lo que sí existe es su
 * `relations` hacia una ubicación (`targetType: 'ubicaciones'`), o en el
 * caso puntual de vehículos, el campo `locations` (slugs de ubicación).
 * Estas funciones resuelven esa cadena: entidad -> slug de ubicación ->
 * zona de esa ubicación (si la ubicación está asignada a alguna).
 */

import type { Entity, EntityRelation } from '@/types'
import { EntityType } from '@/types'

export interface MapCategoryConfig {
  type: EntityType
  /** Etiqueta corta para chips/checkboxes de filtro. */
  label: string
  /** Color de acento del pin y del check activo (hex). */
  color: string
  /** Glifo mostrado dentro del pin — sin dependencias de íconos externos. */
  glyph: string
}

/**
 * Categorías habilitadas en el mapa, en el orden en que se muestran los
 * filtros. Agregar una nueva categoría acá es suficiente para que aparezca
 * como filtro y con su propio ícono — siempre que sus entidades tengan
 * `relations` hacia una `ubicaciones` (o, en vehículos, `locations`).
 */
export const MAP_CATEGORIES: MapCategoryConfig[] = [
  { type: EntityType.LOCATION, label: 'Ubicaciones', color: '#e8b95c', glyph: '📍' },
  { type: EntityType.WEAPON, label: 'Armas', color: '#ff5c5c', glyph: '🔫' },
  { type: EntityType.VEHICLE, label: 'Vehículos', color: '#22d3ee', glyph: '🚗' },
  { type: EntityType.MISSION, label: 'Misiones', color: '#ff7ec4', glyph: '🎯' },
  { type: EntityType.OBJECT, label: 'Objetos', color: '#a78bfa', glyph: '🎒' },
]

export const MAP_CATEGORY_TYPES = MAP_CATEGORIES.map((c) => c.type)

export function getMapCategoryConfig(type: EntityType): MapCategoryConfig {
  return MAP_CATEGORIES.find((c) => c.type === type) ?? MAP_CATEGORIES[0]
}

/**
 * Devuelve el primer slug de `ubicaciones` relacionado con una entidad,
 * o `null` si no tiene ninguna relación (o campo `locations`) que apunte
 * a una ubicación catalogada.
 */
export function resolveEntityLocationSlug(entity: Entity): string | null {
  if (entity.type === EntityType.LOCATION) return entity.slug

  const relations = (entity.relations ?? []) as EntityRelation[]
  const locationRelation = relations.find((r) => r.targetType === EntityType.LOCATION)
  if (locationRelation) return locationRelation.targetSlug

  // Los vehículos, además de `relations`, suelen listar ubicaciones en un
  // campo propio (`locations: string[]`) — se usa como respaldo.
  const maybeLocations = (entity as { locations?: unknown }).locations
  if (Array.isArray(maybeLocations) && typeof maybeLocations[0] === 'string') {
    return maybeLocations[0]
  }

  return null
}
