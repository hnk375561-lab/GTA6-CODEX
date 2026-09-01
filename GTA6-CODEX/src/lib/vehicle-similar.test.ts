import { describe, expect, it } from 'vitest'
import { EntityType, type Vehicle } from '@/types'
import { getSimilarVehicles } from '@/lib/vehicle-similar'

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

describe('getSimilarVehicles', () => {
  const base = makeVehicle({ slug: 'sedan-base', title: 'Sedán Base', class: 'Sedán ejecutivo', power: '250 hp' })

  it('devuelve [] si el vehículo base no tiene class documentada', () => {
    const sinClass = makeVehicle({ slug: 'sin-class', title: 'Sin clase' })
    expect(getSimilarVehicles(sinClass, [base])).toEqual([])
  })

  it('nunca cruza categorías amplias distintas', () => {
    const pickup = makeVehicle({ slug: 'pickup-1', title: 'Pickup 1', class: 'Pickup mediana', power: '250 hp' })
    const result = getSimilarVehicles(base, [base, pickup])
    expect(result).toEqual([])
  })

  it('excluye al propio vehículo de sus resultados', () => {
    const result = getSimilarVehicles(base, [base])
    expect(result).toEqual([])
  })

  it('excluye slugs pasados en excludeSlugs (para no duplicar RelationsPanel)', () => {
    const otroSedan = makeVehicle({ slug: 'sedan-2', title: 'Sedán 2', class: 'Sedán compacto', power: '240 hp' })
    const result = getSimilarVehicles(base, [base, otroSedan], { excludeSlugs: new Set(['sedan-2']) })
    expect(result).toEqual([])
  })

  it('ordena por cercanía de potencia, más cercano primero', () => {
    const lejano = makeVehicle({ slug: 'sedan-lejano', title: 'Sedán lejano', class: 'Sedán compacto', power: '400 hp' })
    const cercano = makeVehicle({ slug: 'sedan-cercano', title: 'Sedán cercano', class: 'Sedán compacto', power: '260 hp' })
    const result = getSimilarVehicles(base, [base, lejano, cercano])
    expect(result.map((r) => r.vehicle.slug)).toEqual(['sedan-cercano', 'sedan-lejano'])
    expect(result[0].powerDiff).toBe(10)
    expect(result[1].powerDiff).toBe(150)
  })

  it('candidatos sin potencia parseable van al final, sin distancia inventada', () => {
    const conPotencia = makeVehicle({ slug: 'sedan-con-hp', title: 'Con hp', class: 'Sedán compacto', power: '260 hp' })
    const sinPotencia = makeVehicle({ slug: 'sedan-sin-hp', title: 'Sin hp', class: 'Sedán compacto' })
    const result = getSimilarVehicles(base, [base, sinPotencia, conPotencia])
    expect(result.map((r) => r.vehicle.slug)).toEqual(['sedan-con-hp', 'sedan-sin-hp'])
    expect(result[1].powerDiff).toBeNull()
  })

  it('respeta el límite pasado', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeVehicle({ slug: `sedan-${i}`, title: `Sedán ${i}`, class: 'Sedán compacto', power: `${250 + i} hp` })
    )
    const result = getSimilarVehicles(base, [base, ...many], { limit: 3 })
    expect(result).toHaveLength(3)
  })
})
