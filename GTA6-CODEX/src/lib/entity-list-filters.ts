import Fuse from 'fuse.js'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { STATUS_LABELS } from '@/lib/entity-labels'
import { vehiclePerformanceScore, hasPerformanceData } from '@/lib/vehicle-performance'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
import { parseYear } from '@/lib/vehicle-year'
import { computeCategoryOptions, getVehicleCategory, type CategoryOption, type VehicleCategory } from '@/lib/vehicle-category'

export type StatusFilter = 'todos' | keyof typeof STATUS_LABELS

export type SortOption = 'default' | 'az' | 'za' | 'recent' | 'connections' | 'performance' | 'power' | 'price'

export const SORT_LABELS: Record<SortOption, string> = {
  default: 'Orden por defecto',
  az: 'A-Z',
  za: 'Z-A',
  recent: 'Más recientes',
  connections: 'Más conexiones',
  performance: 'Mejor rendimiento',
  power: 'Más potentes',
  price: 'Menor precio',
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
  // Ranking programático por potencia/precio (audit2.md, sección 15,
  // oportunidad #5): cálculo puro sobre `power`/`price`, sin dato nuevo.
  // Se ofrece solo si al menos 2 vehículos tienen un valor parseable —
  // con 0 o 1 no hay nada real que "ordenar" (mismo criterio que ya usa
  // `computePriceBounds`/`computePowerBounds` para los filtros de rango).
  if (isVehicleList && entities.filter((e) => parsePowerHp(e as Vehicle) !== null).length >= 2) {
    options.push('power')
  }
  if (isVehicleList && entities.filter((e) => parsePriceUsd(e as Vehicle) !== null).length >= 2) {
    options.push('price')
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
 *  atributo propio que varía de forma consistente entre entidades).
 *  Si se pasa `classGroup`, solo cuenta valores detallados que
 *  pertenezcan a esa categoría amplia — es el sub-filtro que aparece una
 *  vez elegida una categoría (SUV/Sedán/Pickup/Hatchback/Deportivo/Moto),
 *  en vez de listar los 77 valores detallados de una. */
export function computeClassOptions(
  entities: Entity[],
  type: EntityType,
  classGroup?: VehicleCategory | null
): ClassOption[] {
  if (type !== EntityType.VEHICLE) return []
  const freq = new Map<string, number>()
  for (const e of entities) {
    const value = (e as Vehicle).class
    if (!value) continue
    if (classGroup && getVehicleCategory(value) !== classGroup) continue
    freq.set(value, (freq.get(value) ?? 0) + 1)
  }
  return Array.from(freq.entries())
    .filter(([, count]) => count >= MIN_ATTRIBUTE_COUNT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([value, count]) => ({ value, count }))
}

/** Categorías amplias disponibles como filtro de primer nivel, exclusivo
 *  de Vehículos — ver `vehicle-category.ts` para el criterio de
 *  agrupación. */
export function computeCategoryOptionsForList(entities: Entity[], type: EntityType): CategoryOption[] {
  if (type !== EntityType.VEHICLE) return []
  return computeCategoryOptions(entities as Vehicle[], MIN_ATTRIBUTE_COUNT)
}

export interface FilterEntitiesParams {
  entities: Entity[]
  query: string
  status: StatusFilter
  selectedClass: string | null
  /** Categoría amplia (filtro de primer nivel), opcional — igual
   *  criterio que `powerRange`/`priceRange`: `undefined`/`null` = sin
   *  filtro, mismo comportamiento que antes de que existiera esta
   *  opción (callers existentes no necesitan pasarla). Cuando está
   *  seteada junto con `selectedClass`, el detalle manda (la UI limpia
   *  `selectedClass` al cambiar de grupo, pero la función queda
   *  correcta igual si llegaran ambos). */
  selectedClassGroup?: VehicleCategory | null
  selectedTags: string[]
  sortBy: SortOption
  relationCountBySlug?: Record<string, number>
  /** [min, max] en hp. Solo tiene efecto sobre Vehículos (el resto de
   *  tipos no tiene `power`, así que cualquier filtro los excluiría por
   *  completo por error). `null` = sin filtro (comportamiento anterior). */
  powerRange?: [number, number] | null
  /** [min, max] en USD, sobre `parsePriceUsd`. Mismo criterio que
   *  `powerRange`: un vehículo sin precio en USD parseable (otra moneda,
   *  "consultar", etc.) queda fuera del resultado filtrado, igual que ya
   *  pasa hoy con `power` no parseable — comportamiento consistente en
   *  todo el listado, documentado en el badge de cobertura de la UI
   *  (ver `EntityListExplorer`). `null` = sin filtro. */
  priceRange?: [number, number] | null
  /** [min, max] de año de lanzamiento (`anoLanzamiento`), sobre
   *  `parseYear`. Mismo criterio que `powerRange`/`priceRange`: un
   *  vehículo sin año válido (ausente, no numérico, o fuera de un rango
   *  de sanidad razonable) queda fuera del resultado filtrado en vez de
   *  inventarse un año. `null` = sin filtro (FASE 2 — filtro de año). */
  yearRange?: [number, number] | null
}

/** Instancia un Fuse.js sobre el set de entidades, con la misma
 *  ponderación de campos que /buscar. Extraído a función para poder
 *  reconstruirlo en cada test sin depender de useMemo/React. */
/**
 * Índice de búsqueda de Fuse.js. Antes solo indexaba `title`/`description`/
 * `tags` — buscar "Toyota" o "SUV" no encontraba nada salvo que esas
 * palabras aparecieran también en el título/descripción/tags de la ficha
 * (oportunidad P2 #7 de la auditoría "AutoFicha: aprovechamiento de
 * datos"). Se agregan `manufacturer`/`class` con peso menor: siguen sin
 * competir con una coincidencia de título, pero ahora "Toyota" encuentra
 * las 15 fichas Toyota aunque el fabricante no esté en su título/tags.
 * Ambas keys son específicas de `Vehicle` — Fuse.js las ignora sin error
 * en los `GenericEntity` (Noticias/Guías) que no las tienen.
 */
export function buildFuse(entities: Entity[]): Fuse<Entity> {
  return new Fuse(entities, {
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'description', weight: 0.2 },
      { name: 'tags', weight: 0.15 },
      { name: 'manufacturer', weight: 0.1 },
      { name: 'class', weight: 0.05 },
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
  const {
    entities,
    query,
    status,
    selectedClass,
    selectedClassGroup,
    selectedTags,
    sortBy,
    relationCountBySlug,
    powerRange,
    priceRange,
    yearRange,
  } = params
  const trimmedQuery = query.trim()

  let base = trimmedQuery ? (fuse ?? buildFuse(entities)).search(trimmedQuery).map((r) => r.item) : entities

  if (status !== 'todos') base = base.filter((e) => e.status === status)
  if (selectedClassGroup) {
    base = base.filter((e) => getVehicleCategory((e as Vehicle).class) === selectedClassGroup)
  }
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
  if (priceRange) {
    const [min, max] = priceRange
    base = base.filter((e) => {
      const usd = parsePriceUsd(e as Vehicle)
      return usd !== null && usd >= min && usd <= max
    })
  }
  if (yearRange) {
    const [min, max] = yearRange
    base = base.filter((e) => {
      const year = parseYear(e as Vehicle)
      return year !== null && year >= min && year <= max
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
  } else if (sortBy === 'power') {
    // Más potentes primero. Los vehículos sin `power` parseable (texto no
    // reconocido, ej. sin dato) van al final en vez de contar como 0 hp —
    // 0 sería un dato inventado, no "sin información".
    base = [...base].sort((a, b) => {
      const hpA = parsePowerHp(a as Vehicle)
      const hpB = parsePowerHp(b as Vehicle)
      if (hpA === null && hpB === null) return 0
      if (hpA === null) return 1
      if (hpB === null) return -1
      return hpB - hpA
    })
  } else if (sortBy === 'price') {
    // Menor precio primero, mismo criterio de "sin dato al final" que
    // `power` de arriba (no se trata `null` como precio 0).
    base = [...base].sort((a, b) => {
      const priceA = parsePriceUsd(a as Vehicle)
      const priceB = parsePriceUsd(b as Vehicle)
      if (priceA === null && priceB === null) return 0
      if (priceA === null) return 1
      if (priceB === null) return -1
      return priceA - priceB
    })
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
