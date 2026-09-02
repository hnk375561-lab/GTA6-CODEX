import { describe, expect, it } from 'vitest'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { computePriceBounds, parsePriceUsd, hasMixedPriceCurrencies } from '@/lib/vehicle-price'

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

describe('parsePriceUsd', () => {
  it('lee un precio "single" en USD desde priceStructured', () => {
    expect(
      parsePriceUsd(
        makeVehicle({
          slug: 'a',
          title: 'A',
          price: 'USD 34.900 (precio de lanzamiento Argentina)',
          priceStructured: { type: 'single', currency: 'USD', amount: 34900, raw: 'USD 34.900' },
        })
      )
    ).toBe(34900)
  })

  it('lee un precio "starting" ("Desde USD ...") desde priceStructured', () => {
    expect(
      parsePriceUsd(
        makeVehicle({
          slug: 'a',
          title: 'A',
          priceStructured: { type: 'starting', currency: 'USD', amount: 33000, raw: 'Desde aprox. USD 33.000' },
        })
      )
    ).toBe(33000)
  })

  it('toma el mínimo (piso) de un precio "range" en USD', () => {
    expect(
      parsePriceUsd(
        makeVehicle({
          slug: 'a',
          title: 'A',
          priceStructured: { type: 'range', currency: 'USD', min: 33000, max: 45000, raw: 'USD 33.000 - USD 45.000' },
        })
      )
    ).toBe(33000)
  })

  it('devuelve null para "unstructured", nunca 0 ni un valor estimado', () => {
    expect(
      parsePriceUsd(
        makeVehicle({
          slug: 'a',
          title: 'A',
          priceStructured: { type: 'unstructured', currency: null, raw: 'Consultar red de concesionarios oficiales' },
        })
      )
    ).toBeNull()
  })

  it('devuelve null para precios estructurados en otra moneda (no convierte ni mezcla monedas)', () => {
    expect(
      parsePriceUsd(
        makeVehicle({
          slug: 'a',
          title: 'A',
          priceStructured: { type: 'single', currency: 'ARS', amount: 4539990, raw: 'ARS 4.539.990' },
        })
      )
    ).toBeNull()
    expect(
      parsePriceUsd(
        makeVehicle({
          slug: 'b',
          title: 'B',
          priceStructured: { type: 'single', currency: 'EUR', amount: 27000, raw: 'EUR 27.000' },
        })
      )
    ).toBeNull()
    expect(
      parsePriceUsd(
        makeVehicle({
          slug: 'c',
          title: 'C',
          // La equivalencia aproximada en USD que declara la fuente para
          // otra moneda (ej. "JPY 2.508.000 (~USD 17.000)") no se usa acá:
          // FASE 1 clasifica ese caso como currency: 'JPY', y esta función
          // nunca convierte — comportamiento distinto al de la versión
          // pre-FASE-2 de este archivo, documentado en el reporte final.
          priceStructured: { type: 'single', currency: 'JPY', amount: 2508000, raw: 'JPY 2.508.000 (~USD 17.000)' },
        })
      )
    ).toBeNull()
  })

  it('devuelve null si no hay priceStructured (contenido no migrado por FASE 1)', () => {
    expect(parsePriceUsd(makeVehicle({ slug: 'a', title: 'A', price: 'USD 34.900' }))).toBeNull()
  })

  it('devuelve null si priceStructured es null explícito', () => {
    expect(parsePriceUsd(makeVehicle({ slug: 'a', title: 'A', priceStructured: null }))).toBeNull()
  })
})

describe('computePriceBounds', () => {
  const vehicles: Entity[] = [
    makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 20000, raw: 'USD 20.000' } }),
    makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'single', currency: 'USD', amount: 35500, raw: 'USD 35.500' } }),
    makeVehicle({ slug: 'c', title: 'C', priceStructured: { type: 'single', currency: 'USD', amount: 80250, raw: 'USD 80.250' } }),
  ]

  it('devuelve el rango redondeado hacia afuera a la centena', () => {
    expect(computePriceBounds(vehicles, EntityType.VEHICLE)).toEqual({ min: 20000, max: 80300 })
  })

  it('devuelve null si el tipo no es Vehículo', () => {
    expect(computePriceBounds(vehicles, EntityType.NEWS)).toBeNull()
  })

  it('devuelve null si menos de 2 entidades tienen precio USD parseable', () => {
    const onlyOne: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 20000, raw: 'USD 20.000' } }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'single', currency: 'ARS', amount: 4539990, raw: 'ARS 4.539.990' } }),
    ]
    expect(computePriceBounds(onlyOne, EntityType.VEHICLE)).toBeNull()
  })

  it('ignora entidades sin precio USD parseable al calcular el rango (otra moneda o unstructured)', () => {
    const mixed: Entity[] = [
      ...vehicles,
      makeVehicle({ slug: 'd', title: 'D', priceStructured: { type: 'single', currency: 'ARS', amount: 4539990, raw: 'ARS 4.539.990' } }),
      makeVehicle({ slug: 'e', title: 'E', priceStructured: { type: 'unstructured', currency: null, raw: 'Consultar' } }),
      makeVehicle({ slug: 'f', title: 'F' }),
    ]
    expect(computePriceBounds(mixed, EntityType.VEHICLE)).toEqual({ min: 20000, max: 80300 })
  })

  it('devuelve null si todos los vehículos con precio USD comparten exactamente el mismo valor', () => {
    const sameValue: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
    ]
    expect(computePriceBounds(sameValue, EntityType.VEHICLE)).toBeNull()
  })
})

describe('hasMixedPriceCurrencies', () => {
  it('devuelve false si todos los vehículos son la misma moneda', () => {
    const vehicles: Vehicle[] = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'single', currency: 'USD', amount: 35000, raw: 'USD 35.000' } }),
    ]
    expect(hasMixedPriceCurrencies(vehicles)).toBe(false)
  })

  it('devuelve true si hay 2+ monedas distintas', () => {
    const vehicles: Vehicle[] = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'single', currency: 'ARS', amount: 4539990, raw: 'ARS 4.539.990' } }),
    ]
    expect(hasMixedPriceCurrencies(vehicles)).toBe(true)
  })

  it('detecta múltiples monedas distintas (USD + EUR + ARS)', () => {
    const vehicles: Vehicle[] = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'single', currency: 'EUR', amount: 27000, raw: 'EUR 27.000' } }),
      makeVehicle({ slug: 'c', title: 'C', priceStructured: { type: 'single', currency: 'ARS', amount: 4539990, raw: 'ARS 4.539.990' } }),
    ]
    expect(hasMixedPriceCurrencies(vehicles)).toBe(true)
  })

  it('devuelve false si no hay vehículos con priceStructured poblado', () => {
    const vehicles: Vehicle[] = [
      makeVehicle({ slug: 'a', title: 'A' }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: null }),
    ]
    expect(hasMixedPriceCurrencies(vehicles)).toBe(false)
  })

  it('ignora vehículos sin priceStructured al contar monedas', () => {
    const vehicles: Vehicle[] = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      makeVehicle({ slug: 'b', title: 'B' }),
      makeVehicle({ slug: 'c', title: 'C', priceStructured: { type: 'single', currency: 'USD', amount: 35000, raw: 'USD 35.000' } }),
    ]
    expect(hasMixedPriceCurrencies(vehicles)).toBe(false)
  })

  it('ignora vehículos con priceStructured.currency null', () => {
    const vehicles: Vehicle[] = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'unstructured', currency: null, raw: 'Consultar' } }),
    ]
    expect(hasMixedPriceCurrencies(vehicles)).toBe(false)
  })

  it('devuelve false para array vacío', () => {
    expect(hasMixedPriceCurrencies([])).toBe(false)
  })
})
