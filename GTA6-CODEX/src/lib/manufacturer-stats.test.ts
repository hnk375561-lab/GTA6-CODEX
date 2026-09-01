import { describe, expect, it } from 'vitest'
import { EntityType, type Vehicle } from '@/types'
import { getManufacturerStats } from '@/lib/manufacturer-stats'

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

describe('getManufacturerStats', () => {
  it('filtra los modelos del fabricante vía slugifyManufacturer (case/acentos)', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Škoda' }),
      makeVehicle({ slug: 'b', title: 'B', manufacturer: 'SKODA' }),
      makeVehicle({ slug: 'c', title: 'C', manufacturer: 'Toyota' }),
    ]
    const stats = getManufacturerStats('skoda', vehicles)
    expect(stats.totalModels).toBe(2)
  })

  it('ignora vehículos sin manufacturer documentado', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Toyota' }),
      makeVehicle({ slug: 'b', title: 'B' }),
    ]
    expect(getManufacturerStats('toyota', vehicles).totalModels).toBe(1)
  })

  it('devuelve totalModels 0 y todos los rangos/listas vacíos si el fabricante no tiene modelos', () => {
    const vehicles = [makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Toyota' })]
    const stats = getManufacturerStats('marca-inexistente', vehicles)
    expect(stats).toEqual({
      totalModels: 0,
      powerRange: null,
      yearRange: null,
      categories: [],
      featuredModels: [],
    })
  })

  it('calcula el rango de potencia ignorando modelos sin power parseable', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Toyota', power: '150 hp' }),
      makeVehicle({ slug: 'b', title: 'B', manufacturer: 'Toyota', power: '300 hp' }),
      makeVehicle({ slug: 'c', title: 'C', manufacturer: 'Toyota' }),
    ]
    expect(getManufacturerStats('toyota', vehicles).powerRange).toEqual({ min: 150, max: 300 })
  })

  it('powerRange es null si ningún modelo tiene power parseable', () => {
    const vehicles = [makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Toyota' })]
    expect(getManufacturerStats('toyota', vehicles).powerRange).toBeNull()
  })

  it('calcula el rango de años sobre anoLanzamiento, ignorando valores inválidos', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Toyota', anoLanzamiento: 2018 }),
      makeVehicle({ slug: 'b', title: 'B', manufacturer: 'Toyota', anoLanzamiento: 2024 }),
      makeVehicle({ slug: 'c', title: 'C', manufacturer: 'Toyota', anoLanzamiento: 'no publicado' }),
    ]
    expect(getManufacturerStats('toyota', vehicles).yearRange).toEqual({ min: 2018, max: 2024 })
  })

  it('yearRange es null si ningún modelo tiene anoLanzamiento parseable', () => {
    const vehicles = [makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Toyota' })]
    expect(getManufacturerStats('toyota', vehicles).yearRange).toBeNull()
  })

  it('agrupa categorías por frecuencia descendente, excluyendo "Otros"', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Toyota', class: 'SUV compacto' }),
      makeVehicle({ slug: 'b', title: 'B', manufacturer: 'Toyota', class: 'SUV grande' }),
      makeVehicle({ slug: 'c', title: 'C', manufacturer: 'Toyota', class: 'Sedán' }),
      makeVehicle({ slug: 'd', title: 'D', manufacturer: 'Toyota', class: 'Microcar eléctrico' }),
    ]
    expect(getManufacturerStats('toyota', vehicles).categories).toEqual([
      { category: 'SUV', count: 2 },
      { category: 'Sedán', count: 1 },
    ])
  })

  it('devuelve solo los modelos featured del fabricante', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', manufacturer: 'Toyota', featured: true }),
      makeVehicle({ slug: 'b', title: 'B', manufacturer: 'Toyota', featured: false }),
      makeVehicle({ slug: 'c', title: 'C', manufacturer: 'Honda', featured: true }),
    ]
    const stats = getManufacturerStats('toyota', vehicles)
    expect(stats.featuredModels).toHaveLength(1)
    expect(stats.featuredModels[0].slug).toBe('a')
  })
})
