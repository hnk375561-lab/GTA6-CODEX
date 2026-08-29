import { describe, expect, it } from 'vitest'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { computePowerBounds, parsePowerHp } from '@/lib/vehicle-power'

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

describe('parsePowerHp', () => {
  it('parsea un número entero simple', () => {
    expect(parsePowerHp(makeVehicle({ slug: 'a', title: 'A', power: '255 hp' }))).toBe(255)
  })

  it('parsea un número decimal', () => {
    expect(parsePowerHp(makeVehicle({ slug: 'a', title: 'A', power: '24.3 hp' }))).toBe(24.3)
  })

  it('ignora aclaraciones entre paréntesis y se queda con el primer número', () => {
    expect(
      parsePowerHp(makeVehicle({ slug: 'a', title: 'A', power: '200 hp (2.0 TFSI base)' }))
    ).toBe(200)
  })

  it('devuelve null si no hay campo power', () => {
    expect(parsePowerHp(makeVehicle({ slug: 'a', title: 'A' }))).toBeNull()
  })

  it('devuelve null si el texto no arranca con un número', () => {
    expect(parsePowerHp(makeVehicle({ slug: 'a', title: 'A', power: 'N/D' }))).toBeNull()
  })
})

describe('computePowerBounds', () => {
  const vehicles: Entity[] = [
    makeVehicle({ slug: 'a', title: 'A', power: '100 hp' }),
    makeVehicle({ slug: 'b', title: 'B', power: '255 hp' }),
    makeVehicle({ slug: 'c', title: 'C', power: '506 hp' }),
  ]

  it('devuelve el rango redondeado hacia afuera al múltiplo de 10', () => {
    expect(computePowerBounds(vehicles, EntityType.VEHICLE)).toEqual({ min: 100, max: 510 })
  })

  it('devuelve null si el tipo no es Vehículo', () => {
    expect(computePowerBounds(vehicles, EntityType.NEWS)).toBeNull()
  })

  it('devuelve null si menos de 2 entidades tienen power parseable', () => {
    const onlyOne: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', power: '100 hp' }),
      makeVehicle({ slug: 'b', title: 'B' }),
    ]
    expect(computePowerBounds(onlyOne, EntityType.VEHICLE)).toBeNull()
  })

  it('devuelve null si todos los vehículos comparten la misma potencia', () => {
    const same: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', power: '150 hp' }),
      makeVehicle({ slug: 'b', title: 'B', power: '150 hp' }),
    ]
    expect(computePowerBounds(same, EntityType.VEHICLE)).toBeNull()
  })

  it('ignora entidades sin power al calcular el rango', () => {
    const mixed: Entity[] = [...vehicles, makeVehicle({ slug: 'd', title: 'D' })]
    expect(computePowerBounds(mixed, EntityType.VEHICLE)).toEqual({ min: 100, max: 510 })
  })
})
