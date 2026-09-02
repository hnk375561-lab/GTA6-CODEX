import { describe, expect, it } from 'vitest'
import { EntityType, type Vehicle } from '@/types'
import {
  fixedComparisonSlug,
  splitFixedComparisonSlug,
  getFixedComparisonPairs,
  resolveFixedComparisonPair,
} from '@/lib/fixed-comparisons'

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

describe('fixedComparisonSlug', () => {
  it('es simétrico: da el mismo slug sin importar el orden de entrada', () => {
    expect(fixedComparisonSlug('bmw-m3', 'audi-rs4')).toBe(fixedComparisonSlug('audi-rs4', 'bmw-m3'))
  })

  it('ordena alfabéticamente', () => {
    expect(fixedComparisonSlug('bmw-m3', 'audi-rs4')).toBe('audi-rs4-vs-bmw-m3')
  })
})

describe('splitFixedComparisonSlug', () => {
  it('separa un par simple', () => {
    expect(splitFixedComparisonSlug('audi-rs4-vs-bmw-m3')).toContainEqual(['audi-rs4', 'bmw-m3'])
  })

  it('devuelve lista vacía si no hay marcador "-vs-"', () => {
    expect(splitFixedComparisonSlug('audi-rs4')).toEqual([])
  })

  it('prueba todas las posiciones cuando un slug contiene "vs" como substring de otra palabra', () => {
    // slugs reales con guiones son comunes (ej. "clase-c", "serie-4"); esto
    // no debe romper el split, solo devolver candidatos a validar contra
    // el catálogo real en el caller.
    const candidates = splitFixedComparisonSlug('mercedes-clase-c-vs-bmw-serie-4')
    expect(candidates).toContainEqual(['mercedes-clase-c', 'bmw-serie-4'])
  })
})

describe('getFixedComparisonPairs', () => {
  it('deriva un par único a partir de una relación competidor unidireccional', () => {
    const a = makeVehicle({
      slug: 'a',
      title: 'A',
      relations: [{ targetType: EntityType.VEHICLE, targetSlug: 'b', relation: 'competidor' }],
    })
    const b = makeVehicle({ slug: 'b', title: 'B' })
    const pairs = getFixedComparisonPairs([a, b])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toEqual({ slugA: 'a', slugB: 'b' })
  })

  it('deduplica cuando la relación competidor es bidireccional en el contenido', () => {
    const a = makeVehicle({
      slug: 'a',
      title: 'A',
      relations: [{ targetType: EntityType.VEHICLE, targetSlug: 'b', relation: 'competidor' }],
    })
    const b = makeVehicle({
      slug: 'b',
      title: 'B',
      relations: [{ targetType: EntityType.VEHICLE, targetSlug: 'a', relation: 'competidor' }],
    })
    const pairs = getFixedComparisonPairs([a, b])
    expect(pairs).toHaveLength(1)
  })

  it('ignora relaciones que no son competidor', () => {
    const a = makeVehicle({
      slug: 'a',
      title: 'A',
      relations: [{ targetType: EntityType.VEHICLE, targetSlug: 'b', relation: 'sucesor' }],
    })
    const b = makeVehicle({ slug: 'b', title: 'B' })
    expect(getFixedComparisonPairs([a, b])).toHaveLength(0)
  })

  it('ignora relaciones que apuntan a un slug inexistente (relación rota, no genera 404)', () => {
    const a = makeVehicle({
      slug: 'a',
      title: 'A',
      relations: [{ targetType: EntityType.VEHICLE, targetSlug: 'no-existe', relation: 'competidor' }],
    })
    expect(getFixedComparisonPairs([a])).toHaveLength(0)
  })

  it('ignora relaciones que no son de tipo vehículo', () => {
    const a = makeVehicle({
      slug: 'a',
      title: 'A',
      relations: [{ targetType: EntityType.MANUFACTURER, targetSlug: 'b', relation: 'competidor' }],
    })
    expect(getFixedComparisonPairs([a])).toHaveLength(0)
  })
})

describe('resolveFixedComparisonPair', () => {
  it('resuelve un par válido sin importar el orden en la URL', () => {
    const a = makeVehicle({
      slug: 'a',
      title: 'A',
      relations: [{ targetType: EntityType.VEHICLE, targetSlug: 'b', relation: 'competidor' }],
    })
    const b = makeVehicle({ slug: 'b', title: 'B' })
    expect(resolveFixedComparisonPair('a-vs-b', [a, b])).toEqual({ slugA: 'a', slugB: 'b' })
  })

  it('devuelve null para un par que no está entre las relaciones curadas', () => {
    const a = makeVehicle({ slug: 'a', title: 'A' })
    const b = makeVehicle({ slug: 'b', title: 'B' })
    expect(resolveFixedComparisonPair('a-vs-b', [a, b])).toBeNull()
  })
})
