import Fuse from 'fuse.js'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { vehiclePerformanceScore, hasPerformanceData } from '@/lib/vehicle-performance'
import { parsePowerHp } from '@/lib/vehicle-power'

export type StatusFilter = 'todos' | keyof typeof STATUS_LABELS

export type SortOption = 'default' | 'az' | 'za' | 'recent' | 'connections' | 'performance'

export const SORT_LABELS: Record<SortOption, string> = {
  default: 'Orden por defecto',
  az: 'A-Z',
  za: 'Z-A',
  recent: 'Más recientes',
  connections: 'Más conexiones',
  performance: 'Mejor rendimiento',
}

/** Un tag/atributo necesita aparecer en al menos 2 entidades del mismo
 *  tipo para contar como "consistente" y mostrarse como filtro — evita
 *  chips inútiles armados a partir de un tag usado una sola vez (ruido,
 *  no una categoría real). */
export const MIN_ATTRIBUTE_COUNT = 2

/** Tope de chips de tag visibles (se muestran los más frecuentes
 *  primero). Puramente de presentación (no descarta datos). */
export const MAX_TAG_OPTIONS = 14

export interface TagOption {
  tag: string
  count: number
}

export interface ClassOption {
  value: string
  count: number
}

/** Conteo de conexiones de una entidad: usa el mapa resuelto en servidor
 *  (relaciones explícitas + inferidas) si está disponible, si no cae a
 *  `entity.relations?.length` (solo explícitas). */
export function getRelationCount(entity: Entity, relationCountBySlug?: Record<string, number>): number {
  return relationCountBySlug?.[entity.slug] ?? entity.relations?.length ?? 0
}

/** Criterios de orden disponibles para un tipo de entidad dado. Nunca
 *  ofrece un criterio sin datos reales que lo respalden. */
export function computeSortOptions(
  entities: Entity[],
  relationCountBySlug: Record<string, number> | undefined,
  isVehicleList: boolean
): SortOption[] {
  const options: SortOption[] = ['default', 'az', 'za', 'recent']
  if (entities.some((e) => getRelationCount(e, relationCountBySlug) > 0)) {
    options.push('connections')
  }
  if (isVehicleList && entities.some((e) => hasPerformanceData(e as Vehicle))) {
    options.push('performance')
  }
  return options
}

/** Tags "consistentes" del tipo actual, ordenados por frecuencia
 *  descendente y luego alfabéticamente, limitados a MAX_TAG_OPTIONS. */
export function computeTagOptions(entities: Entity[]): TagOption[] {
  const freq = new Map<string, number>()
  for (const e of entities) {
    for (const tag of e.tags ?? []) {
      freq.set(tag, (freq.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(freq.entries())
    .filter(([, count]) => count >= MIN_ATTRIBUTE_COUNT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, MAX_TAG_OPTIONS)
    .map(([tag, count]) => ({ tag, count }))
}

/** Filtro por `class`, exclusivo de Vehículos (único tipo con un
 *  atributo propio que varía de forma consistente entre entidades). */
export function computeClassOptions(entities: Entity[], type: EntityType): ClassOption[] {
  if (type !== EntityType.VEHICLE) return []
  const freq = new Map<string, number>()
  for (const e of entities) {
    const value = (e as Vehicle).class
    if (value) freq.set(value, (freq.get(value) ?? 0) + 1)
  }
  return Array.from(freq.entries())
    .filter(([, count]) => count >= MIN_ATTRIBUTE_COUNT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([value, count]) => ({ value, count }))
}

export interface FilterEntitiesParams {
  entities: Entity[]
  query: string
  status: StatusFilter
  selectedClass: string | null
  selectedTags: string[]
  sortBy: SortOption
  relationCountBySlug?: Record<string, number>
  /** [min, max] en hp. Solo tiene efecto sobre Vehículos (el resto de
   *  tipos no tiene `power`, así que cualquier filtro los excluiría por
   *  completo por error). `null` = sin filtro (comportamiento anterior). */
  powerRange?: [number, number] | null
}

/** Instancia un Fuse.js sobre el set de entidades, con la misma
 *  ponderación de campos que /buscar. Extraído a función para poder
 *  reconstruirlo en cada test sin depender de useMemo/React. */
export function buildFuse(entities: Entity[]): Fuse<Entity> {
  return new Fuse(entities, {
    keys: [
      { name: 'title', weight: 0.6 },
      { name: 'description', weight: 0.25 },
      { name: 'tags', weight: 0.15 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  })
}

/** Aplica búsqueda + filtros de estado/clase/tags + orden, en ese orden.
 *  Pura: no toca el DOM ni state de React — así queda testeable de forma
 *  aislada y reutilizable si en el futuro se necesita el mismo pipeline
 *  fuera de EntityListExplorer (ej. en un futuro filtrado server-side). */
export function filterAndSortEntities(params: FilterEntitiesParams, fuse?: Fuse<Entity>): Entity[] {
  const { entities, query, status, selectedClass, selectedTags, sortBy, relationCountBySlug, powerRange } = params
  const trimmedQuery = query.trim()

  let base = trimmedQuery ? (fuse ?? buildFuse(entities)).search(trimmedQuery).map((r) => r.item) : entities

  if (status !== 'todos') base = base.filter((e) => e.status === status)
  if (selectedClass) base = base.filter((e) => (e as Vehicle).class === selectedClass)
  if (selectedTags.length > 0) {
    base = base.filter((e) => e.tags?.some((tag) => selectedTags.includes(tag)))
  }
  if (powerRange) {
    const [min, max] = powerRange
    base = base.filter((e) => {
      const hp = parsePowerHp(e as Vehicle)
      return hp !== null && hp >= min && hp <= max
    })
  }

  if (sortBy === 'az') {
    base = [...base].sort((a, b) => a.title.localeCompare(b.title, 'es'))
  } else if (sortBy === 'za') {
    base = [...base].sort((a, b) => b.title.localeCompare(a.title, 'es'))
  } else if (sortBy === 'recent') {
    base = [...base].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  } else if (sortBy === 'connections') {
    base = [...base].sort(
      (a, b) => getRelationCount(b, relationCountBySlug) - getRelationCount(a, relationCountBySlug)
    )
  } else if (sortBy === 'performance') {
    base = [...base].sort(
      (a, b) => vehiclePerformanceScore(b as Vehicle) - vehiclePerformanceScore(a as Vehicle)
    )
  }

  return base
}

/** Conteo de entidades por estado editorial (incluye 'todos'). */
export function computeStatusCounts(entities: Entity[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { todos: entities.length, confirmado: 0, rumor: 0, nuestro: 0 }
  for (const e of entities) {
    const key = e.status as keyof typeof STATUS_LABELS
    if (key in STATUS_LABELS) counts[key] += 1
  }
  return counts
}
