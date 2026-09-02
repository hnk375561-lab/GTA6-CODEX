import { describe, expect, it } from 'vitest'
import { EntityType, type Vehicle } from '@/types'
import {
  RANKING_MIN_ELIGIBLE,
  RANKING_TOP_N,
  computeRanking,
  getRankingDefinitionBySlug,
  getRankingDefinitions,
  isRankingEligible,
} from '@/lib/rankings'

function makeVehicle(overrides: Partial<Vehicle> & Pick<Vehicle, 'slug' | 'title'>): Vehicle {
  return {
    type: EntityType.VEHICLE,
    description: 'Descripción de prueba',
    status: 'confirmado',
    tags: [],
    featured: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  } as Vehicle
}

const powerDef = getRankingDefinitionBySlug('mas-potentes')!
const priceAscDef = getRankingDefinitionBySlug('mas-baratos')!
const priceDescDef = getRankingDefinitionBySlug('mas-caros')!
const yearDef = getRankingDefinitionBySlug('mas-recientes')!

describe('rankings: definiciones', () => {
  it('define únicamente los rankings respaldados por campos numéricos existentes', () => {
    const slugs = getRankingDefinitions().map((d) => d.slug)
    expect(slugs).toEqual(['mas-potentes', 'mas-baratos', 'mas-caros', 'mas-recientes'])
  })

  it('no define un ranking de "mejor rendimiento" ni "mejor consumo" (sin base numérica confiable)', () => {
    expect(getRankingDefinitionBySlug('mejor-rendimiento')).toBeNull()
    expect(getRankingDefinitionBySlug('mejor-consumo')).toBeNull()
  })
})

describe('computeRanking: potencia', () => {
  it('ordena de forma descendente por hp', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', power: '300 hp' }),
      makeVehicle({ slug: 'b', title: 'B', power: '500 hp' }),
      makeVehicle({ slug: 'c', title: 'C', power: '100 hp' }),
    ]
    const result = computeRanking(powerDef, vehicles)
    expect(result.entries.map((e) => e.vehicle.slug)).toEqual(['b', 'a', 'c'])
    expect(result.entries.map((e) => e.position)).toEqual([1, 2, 3])
    expect(result.entries[0].metricLabel).toBe('500 hp')
  })

  it('excluye vehículos sin potencia parseable, sin tratarlos como 0', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', power: '300 hp' }),
      makeVehicle({ slug: 'b', title: 'B' }), // sin power
      makeVehicle({ slug: 'c', title: 'C', power: 'N/D' }), // no numérico
    ]
    const result = computeRanking(powerDef, vehicles)
    expect(result.entries.map((e) => e.vehicle.slug)).toEqual(['a'])
    expect(result.eligibleCount).toBe(1)
    expect(result.excludedCount).toBe(2)
    expect(result.totalVehicles).toBe(3)
  })

  it('empate: usa tie-breaker estable por título y luego por slug', () => {
    const vehicles = [
      makeVehicle({ slug: 'z-modelo', title: 'Zeta', power: '300 hp' }),
      makeVehicle({ slug: 'a-modelo', title: 'Alfa', power: '300 hp' }),
      makeVehicle({ slug: 'a-otro', title: 'Alfa', power: '300 hp' }),
    ]
    const result = computeRanking(powerDef, vehicles)
    expect(result.entries.map((e) => e.vehicle.slug)).toEqual(['a-modelo', 'a-otro', 'z-modelo'])
  })

  it('es determinístico: dos corridas sobre el mismo dataset dan el mismo resultado', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', power: '300 hp' }),
      makeVehicle({ slug: 'b', title: 'B', power: '500 hp' }),
      makeVehicle({ slug: 'c', title: 'C', power: '500 hp' }),
    ]
    const r1 = computeRanking(powerDef, vehicles)
    const r2 = computeRanking(powerDef, [...vehicles].reverse())
    expect(r1.entries.map((e) => e.vehicle.slug)).toEqual(r2.entries.map((e) => e.vehicle.slug))
  })

  it('respeta el Top N: no muestra más de RANKING_TOP_N entradas', () => {
    const vehicles = Array.from({ length: RANKING_TOP_N + 10 }, (_, i) =>
      makeVehicle({ slug: `v-${i}`, title: `V${i}`, power: `${i + 1} hp` })
    )
    const result = computeRanking(powerDef, vehicles)
    expect(result.entries.length).toBe(RANKING_TOP_N)
    expect(result.eligibleCount).toBe(vehicles.length)
  })
})

describe('computeRanking: precio', () => {
  it('ordena ascendente (más baratos) solo sobre precio estructurado en USD', () => {
    const vehicles = [
      makeVehicle({
        slug: 'a',
        title: 'A',
        priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' },
      }),
      makeVehicle({
        slug: 'b',
        title: 'B',
        priceStructured: { type: 'single', currency: 'USD', amount: 20000, raw: 'USD 20.000' },
      }),
    ]
    const result = computeRanking(priceAscDef, vehicles)
    expect(result.entries.map((e) => e.vehicle.slug)).toEqual(['b', 'a'])
  })

  it('ordena descendente (más caros) solo sobre precio estructurado en USD', () => {
    const vehicles = [
      makeVehicle({
        slug: 'a',
        title: 'A',
        priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' },
      }),
      makeVehicle({
        slug: 'b',
        title: 'B',
        priceStructured: { type: 'single', currency: 'USD', amount: 90000, raw: 'USD 90.000' },
      }),
    ]
    const result = computeRanking(priceDescDef, vehicles)
    expect(result.entries.map((e) => e.vehicle.slug)).toEqual(['b', 'a'])
  })

  it('excluye monedas distintas de USD sin convertirlas', () => {
    const vehicles = [
      makeVehicle({
        slug: 'usd-car',
        title: 'USD Car',
        priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' },
      }),
      makeVehicle({
        slug: 'ars-car',
        title: 'ARS Car',
        priceStructured: { type: 'single', currency: 'ARS', amount: 50000000, raw: 'ARS 50.000.000' },
      }),
    ]
    const result = computeRanking(priceAscDef, vehicles)
    expect(result.entries.map((e) => e.vehicle.slug)).toEqual(['usd-car'])
    expect(result.eligibleCount).toBe(1)
  })

  it('usa el piso (min) de un rango de precio, nunca un promedio', () => {
    const vehicles = [
      makeVehicle({
        slug: 'range-car',
        title: 'Range Car',
        priceStructured: { type: 'range', currency: 'USD', min: 25000, max: 45000, raw: 'USD 25.000 - USD 45.000' },
      }),
    ]
    const result = computeRanking(priceAscDef, vehicles)
    expect(result.entries[0].metricValue).toBe(25000)
  })

  it('excluye precio no estructurado (unstructured) y ausencia de priceStructured', () => {
    const vehicles = [
      makeVehicle({
        slug: 'unstructured',
        title: 'Unstructured',
        priceStructured: { type: 'unstructured', currency: null, raw: 'Consultar' },
      }),
      makeVehicle({ slug: 'no-price', title: 'No Price' }),
    ]
    const result = computeRanking(priceAscDef, vehicles)
    expect(result.entries).toEqual([])
    expect(result.eligibleCount).toBe(0)
  })
})

describe('computeRanking: año', () => {
  it('ordena descendente (más recientes)', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 2020 }),
      makeVehicle({ slug: 'b', title: 'B', anoLanzamiento: 2026 }),
      makeVehicle({ slug: 'c', title: 'C', anoLanzamiento: 2015 }),
    ]
    const result = computeRanking(yearDef, vehicles)
    expect(result.entries.map((e) => e.vehicle.slug)).toEqual(['b', 'a', 'c'])
  })

  it('excluye años inválidos o ausentes', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 2020 }),
      makeVehicle({ slug: 'b', title: 'B', anoLanzamiento: 1800 }), // fuera de rango sano
      makeVehicle({ slug: 'c', title: 'C' }), // ausente
    ]
    const result = computeRanking(yearDef, vehicles)
    expect(result.entries.map((e) => e.vehicle.slug)).toEqual(['a'])
  })
})

describe('computeRanking / isRankingEligible: casos generales', () => {
  it('dataset vacío produce un ranking vacío y no elegible', () => {
    const result = computeRanking(powerDef, [])
    expect(result.entries).toEqual([])
    expect(result.eligibleCount).toBe(0)
    expect(isRankingEligible(result)).toBe(false)
  })

  it('dataset con un solo vehículo comparable no es elegible (por debajo del umbral)', () => {
    const result = computeRanking(powerDef, [makeVehicle({ slug: 'a', title: 'A', power: '300 hp' })])
    expect(result.eligibleCount).toBe(1)
    expect(isRankingEligible(result)).toBe(false)
  })

  it('dataset justo por debajo del umbral no es elegible', () => {
    const vehicles = Array.from({ length: RANKING_MIN_ELIGIBLE - 1 }, (_, i) =>
      makeVehicle({ slug: `v-${i}`, title: `V${i}`, power: `${i + 1} hp` })
    )
    const result = computeRanking(powerDef, vehicles)
    expect(isRankingEligible(result)).toBe(false)
  })

  it('dataset en o por encima del umbral es elegible', () => {
    const vehicles = Array.from({ length: RANKING_MIN_ELIGIBLE }, (_, i) =>
      makeVehicle({ slug: `v-${i}`, title: `V${i}`, power: `${i + 1} hp` })
    )
    const result = computeRanking(powerDef, vehicles)
    expect(isRankingEligible(result)).toBe(true)
  })
})
