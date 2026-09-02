import { describe, expect, it } from 'vitest'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { computeYearBounds, parseYear } from '@/lib/vehicle-year'

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

describe('parseYear', () => {
  it('parsea anoLanzamiento como number', () => {
    expect(parseYear(makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 2021 }))).toBe(2021)
  })

  it('parsea anoLanzamiento como string', () => {
    expect(parseYear(makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: '2021' }))).toBe(2021)
  })

  it('devuelve null si el campo falta', () => {
    expect(parseYear(makeVehicle({ slug: 'a', title: 'A' }))).toBeNull()
  })

  it('devuelve null si el campo es null explícito', () => {
    expect(parseYear(makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: null }))).toBeNull()
  })

  it('devuelve null para un string no numérico', () => {
    expect(parseYear(makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 'desconocido' }))).toBeNull()
  })

  it('devuelve null para un año fuera de rango razonable (nunca "corrige" el dato)', () => {
    expect(parseYear(makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 1899 }))).toBeNull()
    expect(parseYear(makeVehicle({ slug: 'b', title: 'B', anoLanzamiento: 3000 }))).toBeNull()
  })

  it('devuelve null para un valor decimal (no es un año entero válido)', () => {
    expect(parseYear(makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 2021.5 }))).toBeNull()
  })

  it('acepta un año histórico válido dentro del rango de sanidad', () => {
    expect(parseYear(makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 1962 }))).toBe(1962)
  })
})

describe('computeYearBounds', () => {
  const vehicles: Entity[] = [
    makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 2015 }),
    makeVehicle({ slug: 'b', title: 'B', anoLanzamiento: 2020 }),
    makeVehicle({ slug: 'c', title: 'C', anoLanzamiento: 1962 }),
  ]

  it('devuelve el rango exacto (sin redondear)', () => {
    expect(computeYearBounds(vehicles, EntityType.VEHICLE)).toEqual({ min: 1962, max: 2020 })
  })

  it('devuelve null si el tipo no es Vehículo', () => {
    expect(computeYearBounds(vehicles, EntityType.NEWS)).toBeNull()
  })

  it('devuelve null si menos de 2 entidades tienen año válido', () => {
    const onlyOne: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 2015 }),
      makeVehicle({ slug: 'b', title: 'B', anoLanzamiento: null }),
    ]
    expect(computeYearBounds(onlyOne, EntityType.VEHICLE)).toBeNull()
  })

  it('ignora entidades sin año válido al calcular el rango', () => {
    const mixed: Entity[] = [...vehicles, makeVehicle({ slug: 'd', title: 'D', anoLanzamiento: 'sin dato' })]
    expect(computeYearBounds(mixed, EntityType.VEHICLE)).toEqual({ min: 1962, max: 2020 })
  })

  it('devuelve null si todos los vehículos con año comparten exactamente el mismo valor', () => {
    const sameValue: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 2020 }),
      makeVehicle({ slug: 'b', title: 'B', anoLanzamiento: 2020 }),
    ]
    expect(computeYearBounds(sameValue, EntityType.VEHICLE)).toBeNull()
  })
})
