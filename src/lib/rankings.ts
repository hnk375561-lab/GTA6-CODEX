import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from './entities'
import { parsePowerHp } from './vehicle-power'
import { parsePriceUsd } from './vehicle-price'
import { parseYear } from './vehicle-year'

/**
 * Motor de rankings programáticos (FASE 3).
 *
 * REGLA ABSOLUTA (ver spec de la fase): un ranking solo puede existir si se
 * apoya en un campo numérico estructurado y comparable. Este archivo
 * reutiliza exclusivamente los parsers ya validados de fases anteriores
 * (`parsePowerHp`, `parsePriceUsd`, `parseYear`) — nunca vuelve a parsear
 * texto libre por su cuenta, nunca convierte moneda, nunca normaliza una
 * unidad que el dataset no normaliza ya.
 *
 * Dos rankings que el audit de la fase consideró explícitamente y que
 * NO se implementan acá, a propósito:
 *
 * - "Mejor rendimiento": la única métrica combinada existente
 *   (`vehiclePerformanceScore` en `vehicle-performance.ts`) sale de sumar
 *   categorías cualitativas ("Alta", "Media-Alta"...) mapeadas 1-5 a mano.
 *   Es útil como orden relativo *dentro* del listado/filtro de catálogo,
 *   pero no es un dato numérico real del vehículo (0-100, velocidad
 *   máxima) — es un rating sintético. La regla de la fase prohíbe
 *   explícitamente "ratings sintéticos" como base de un ranking. Queda
 *   documentado como pendiente hasta que el catálogo tenga una métrica de
 *   rendimiento numérica real (ej. 0-100 en segundos).
 * - "Mejor consumo": `vehicle-compare-best.ts` ya documenta que `consumo`
 *   es texto libre con unidades mezcladas (L/100km, km/L, MPGe) donde
 *   "mayor" significa cosas opuestas según la unidad — comparar sin
 *   normalizar sería inventar un dato. Esta fase no hace una segunda
 *   migración de datos (fuera de alcance), así que este ranking también
 *   queda pendiente.
 */

export type RankingMetricUnit = 'hp' | 'usd' | 'year'

export interface RankingDefinition {
  /** Slug de la URL: /rankings/{slug} */
  slug: string
  /** Título completo, usado como <h1> y en <title>. */
  title: string
  /** Nombre corto, usado en navegación/índice. */
  shortTitle: string
  metricUnit: RankingMetricUnit
  /** Campo/criterio exacto usado para ordenar (para el reporte de la fase
   *  y para la introducción SEO — nunca un texto vago tipo "el mejor"). */
  criterionLabel: string
  direction: 'asc' | 'desc'
  /** Extrae el valor numérico comparable de un vehículo, o `null` si no es
   *  comparable (dato ausente/inválido) — el vehículo se excluye de este
   *  ranking específico, nunca recibe 0 ni un valor inventado. */
  getValue: (vehicle: Vehicle) => number | null
  /** Formatea el valor para mostrarlo como métrica visible en la card
   *  (Paso 11: siempre el mismo dato que determinó el orden). */
  formatValue: (value: number) => string
  /** Párrafo introductorio SEO: qué mide, qué unidad, qué se considera,
   *  qué limitaciones tiene. Nunca estadísticas inventadas. */
  intro: string
  metaDescription: string
}

export interface RankingEntry {
  vehicle: Vehicle
  position: number
  metricValue: number
  metricLabel: string
}

export interface RankingResult {
  def: RankingDefinition
  entries: RankingEntry[]
  /** Total de vehículos con dato comparable para este ranking (puede ser
   *  mayor a `entries.length` si el catálogo supera RANKING_TOP_N). */
  eligibleCount: number
  /** Vehículos del catálogo total excluidos por no tener dato comparable. */
  excludedCount: number
  totalVehicles: number
}

/** Umbral mínimo de vehículos elegibles (PASO 6) para que un ranking tenga
 *  página propia — evita thin content. Vehicle-class-groups.ts usa 8 como
 *  umbral para categorías amplias; los rankings son páginas más
 *  "flagship" (se enlazan desde /rankings y se indexan de forma
 *  prioritaria), así que se pide un piso mayor de contenido real. */
export const RANKING_MIN_ELIGIBLE = 20

/** Cantidad de posiciones mostradas por ranking (Top N). No es un límite
 *  de elegibilidad — solo cuántos vehículos entran en la página. */
export const RANKING_TOP_N = 25

function formatHp(value: number): string {
  return `${Math.round(value)} hp`
}

function formatUsd(value: number): string {
  return `USD ${Math.round(value).toLocaleString('en-US')}`
}

function formatYear(value: number): string {
  return `${Math.round(value)}`
}

const RANKING_DEFINITIONS: RankingDefinition[] = [
  {
    slug: 'mas-potentes',
    title: 'Los vehículos más potentes del catálogo',
    shortTitle: 'Más potentes',
    metricUnit: 'hp',
    criterionLabel: 'power (hp), orden descendente',
    direction: 'desc',
    getValue: (v) => parsePowerHp(v),
    formatValue: formatHp,
    intro:
      'Ranking calculado automáticamente a partir de la potencia (hp) declarada en la ficha técnica de cada vehículo. Se ordena de mayor a menor potencia. Solo se incluyen vehículos con un valor de potencia numérico y comparable; los que no tienen ese dato cargado no participan de este ranking (pero siguen disponibles en el catálogo y la búsqueda). El orden se recalcula automáticamente cada vez que cambian los datos del catálogo.',
    metaDescription:
      'Ranking automático de los vehículos con mayor potencia (hp) del catálogo de Sin Frenos, ordenado por dato real de ficha técnica.',
  },
  {
    slug: 'mas-baratos',
    title: 'Los vehículos más baratos del catálogo (USD)',
    shortTitle: 'Más baratos',
    metricUnit: 'usd',
    criterionLabel: 'precio en USD, orden ascendente',
    direction: 'asc',
    getValue: (v) => parsePriceUsd(v),
    formatValue: formatUsd,
    intro:
      'Ranking calculado automáticamente a partir del precio estructurado en dólares estadounidenses (USD) de cada vehículo. Se ordena de menor a mayor precio. El catálogo incluye precios en varias monedas (USD, ARS, EUR, GBP y otras); para evitar comparar monedas distintas como si fueran la misma unidad, este ranking se limita exclusivamente a vehículos con precio estructurado en USD — no se realiza ninguna conversión de moneda. Los vehículos con precio en otra moneda, sin precio o con precio no estructurable no participan de este ranking, pero siguen disponibles en el catálogo. El orden se recalcula automáticamente cada vez que cambian los datos del catálogo.',
    metaDescription:
      'Ranking automático de los vehículos con menor precio en USD del catálogo de Sin Frenos, sin conversión de moneda.',
  },
  {
    slug: 'mas-caros',
    title: 'Los vehículos más caros del catálogo (USD)',
    shortTitle: 'Más caros',
    metricUnit: 'usd',
    criterionLabel: 'precio en USD, orden descendente',
    direction: 'desc',
    getValue: (v) => parsePriceUsd(v),
    formatValue: formatUsd,
    intro:
      'Ranking calculado automáticamente a partir del precio estructurado en dólares estadounidenses (USD) de cada vehículo. Se ordena de mayor a menor precio. Igual que en "Más baratos", este ranking se limita exclusivamente a vehículos con precio estructurado en USD, sin ninguna conversión de moneda, para no mezclar monedas distintas en una misma comparación. Los vehículos con precio en otra moneda, sin precio o con precio no estructurable no participan de este ranking, pero siguen disponibles en el catálogo. El orden se recalcula automáticamente cada vez que cambian los datos del catálogo.',
    metaDescription:
      'Ranking automático de los vehículos con mayor precio en USD del catálogo de Sin Frenos, sin conversión de moneda.',
  },
  {
    slug: 'mas-recientes',
    title: 'Los vehículos más recientes del catálogo',
    shortTitle: 'Más recientes',
    metricUnit: 'year',
    criterionLabel: 'anoLanzamiento, orden descendente',
    direction: 'desc',
    getValue: (v) => parseYear(v),
    formatValue: formatYear,
    intro:
      'Ranking calculado automáticamente a partir del año de lanzamiento (anoLanzamiento) de cada vehículo. Se ordena del más nuevo al más antiguo. Solo se incluyen vehículos con un año de lanzamiento válido (entre 1900 y el año actual más un margen para modelos ya anunciados); los que no tienen ese dato cargado o tienen un valor fuera de rango no participan de este ranking. El orden se recalcula automáticamente cada vez que cambian los datos del catálogo.',
    metaDescription:
      'Ranking automático de los vehículos más recientes del catálogo de Sin Frenos, ordenado por año de lanzamiento real.',
  },
]

export function getRankingDefinitions(): RankingDefinition[] {
  return RANKING_DEFINITIONS
}

export function getRankingDefinitionBySlug(slug: string): RankingDefinition | null {
  return RANKING_DEFINITIONS.find((d) => d.slug === slug) ?? null
}

/**
 * Calcula un ranking a partir de una lista de vehículos ya cargada
 * (PASO 7/8): dataset → validación (getValue) → filtrado de comparables →
 * ordenamiento con tie-breaker estable → top N. Determinístico: para el
 * mismo `vehicles` siempre produce exactamente el mismo resultado, sin
 * random, timestamps ni I/O.
 *
 * Tie-breaker (PASO 8, documentado): a valor de métrica igual, se ordena
 * alfabéticamente por título y, si también empata, por slug. Es estable
 * y no depende de ningún dato ausente.
 */
export function computeRanking(def: RankingDefinition, vehicles: Vehicle[]): RankingResult {
  const withValue = vehicles.reduce<Array<{ vehicle: Vehicle; value: number }>>((acc, vehicle) => {
    const value = def.getValue(vehicle)
    if (value !== null && Number.isFinite(value)) {
      acc.push({ vehicle, value })
    }
    return acc
  }, [])

  const sorted = [...withValue].sort((a, b) => {
    if (a.value !== b.value) {
      return def.direction === 'desc' ? b.value - a.value : a.value - b.value
    }
    const titleCompare = a.vehicle.title.localeCompare(b.vehicle.title, 'es')
    if (titleCompare !== 0) return titleCompare
    return a.vehicle.slug.localeCompare(b.vehicle.slug, 'es')
  })

  const entries: RankingEntry[] = sorted.slice(0, RANKING_TOP_N).map((item, index) => ({
    vehicle: item.vehicle,
    position: index + 1,
    metricValue: item.value,
    metricLabel: def.formatValue(item.value),
  }))

  return {
    def,
    entries,
    eligibleCount: sorted.length,
    excludedCount: vehicles.length - sorted.length,
    totalVehicles: vehicles.length,
  }
}

/** PASO 6: umbral contra thin content. Un ranking con menos vehículos
 *  elegibles que `RANKING_MIN_ELIGIBLE` no debe tener página indexable. */
export function isRankingEligible(result: RankingResult): boolean {
  return result.eligibleCount >= RANKING_MIN_ELIGIBLE
}

/**
 * Todos los rankings definidos, ya calculados contra el catálogo real y
 * filtrados a los que superan el umbral de contenido. Usado por la página
 * índice `/rankings`, por `generateStaticParams` de `/rankings/[slug]` y
 * por `sitemap.ts`, para que las tres fuentes siempre coincidan.
 */
export async function getAvailableRankings(): Promise<RankingResult[]> {
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  return RANKING_DEFINITIONS.map((def) => computeRanking(def, vehicles)).filter(isRankingEligible)
}

/** Ranking puntual por slug, o `null` si no existe o no llega al umbral
 *  (misma condición que `getAvailableRankings`, para que una URL que no
 *  aparece en el índice tampoco responda con contenido thin). */
export async function getRankingBySlug(slug: string): Promise<RankingResult | null> {
  const def = getRankingDefinitionBySlug(slug)
  if (!def) return null
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const result = computeRanking(def, vehicles)
  return isRankingEligible(result) ? result : null
}
