import { describe, it, expect } from 'vitest'
import { parseUrlSelection, resolveInitialSelection, resolveVehicles } from './vehicle-compare-selection'
import type { Vehicle } from '@/types'
import { EntityType } from '@/types'

describe('parseUrlSelection', () => {
  const validSlugs = new Set(['toyota-corolla', 'honda-civic', 'mazda-3'])

  it('devuelve array vacío si rawQuery es null', () => {
    expect(parseUrlSelection(null, 5, validSlugs)).toEqual([])
  })

  it('devuelve array vacío si rawQuery es string vacío', () => {
    expect(parseUrlSelection('', 5, validSlugs)).toEqual([])
  })

  it('parsea un único slug válido', () => {
    expect(parseUrlSelection('toyota-corolla', 5, validSlugs)).toEqual(['toyota-corolla'])
  })

  it('parsea múltiples slugs válidos', () => {
    expect(parseUrlSelection('toyota-corolla,honda-civic', 5, validSlugs)).toEqual(['toyota-corolla', 'honda-civic'])
  })

  it('filtra slugs inválidos', () => {
    expect(parseUrlSelection('toyota-corolla,invalid-slug,honda-civic', 5, validSlugs)).toEqual(['toyota-corolla', 'honda-civic'])
  })

  it('respeta maxCompare', () => {
    const result = parseUrlSelection('toyota-corolla,honda-civic,mazda-3,invalid,invalid', 2, validSlugs)
    expect(result).toHaveLength(2)
    expect(result).toEqual(['toyota-corolla', 'honda-civic'])
  })

  it('ignora slugs vacíos entre comas', () => {
    expect(parseUrlSelection('toyota-corolla,,honda-civic', 5, validSlugs)).toEqual(['toyota-corolla', 'honda-civic'])
  })
})

describe('resolveInitialSelection', () => {
  const urlSelection = ['toyota-corolla', 'honda-civic']
  const storedSelection = ['mazda-3']

  it('URL explícita gana siempre', () => {
    const { selection, fromUrl } = resolveInitialSelection(true, urlSelection, storedSelection)
    expect(selection).toEqual(urlSelection)
    expect(fromUrl).toBe(true)
  })

  it('localStorage se usa cuando no hay URL', () => {
    const { selection, fromUrl } = resolveInitialSelection(false, [], storedSelection)
    expect(selection).toEqual(storedSelection)
    expect(fromUrl).toBe(false)
  })

  it('vacío cuando no hay URL ni storage', () => {
    const { selection, fromUrl } = resolveInitialSelection(false, [], [])
    expect(selection).toEqual([])
    expect(fromUrl).toBe(false)
  })

  it('URL vacía no reemplaza storage', () => {
    const { selection } = resolveInitialSelection(true, [], storedSelection)
    expect(selection).toEqual(storedSelection)
  })

  it('localStorage se ignora cuando hay URL no-vacía', () => {
    const { selection } = resolveInitialSelection(true, urlSelection, storedSelection)
    expect(selection).toEqual(urlSelection)
    expect(selection).not.toContain('mazda-3')
  })
})

describe('resolveVehicles', () => {
  const vehicles: Vehicle[] = [
    {
      type: EntityType.VEHICLE,
      slug: 'toyota-corolla',
      title: 'Toyota Corolla',
    } as Vehicle,
    {
      type: EntityType.VEHICLE,
      slug: 'honda-civic',
      title: 'Honda Civic',
    } as Vehicle,
    {
      type: EntityType.VEHICLE,
      slug: 'mazda-3',
      title: 'Mazda 3',
    } as Vehicle,
  ]

  it('devuelve vehículos en el mismo orden de los slugs', () => {
    const result = resolveVehicles(['mazda-3', 'toyota-corolla'], vehicles)
    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe('mazda-3')
    expect(result[1].slug).toBe('toyota-corolla')
  })

  it('filtra slugs que no existen', () => {
    const result = resolveVehicles(['toyota-corolla', 'invalid-slug', 'honda-civic'], vehicles)
    expect(result).toHaveLength(2)
    expect(result.map((v) => v.slug)).toEqual(['toyota-corolla', 'honda-civic'])
  })

  it('devuelve array vacío si selection es vacío', () => {
    expect(resolveVehicles([], vehicles)).toEqual([])
  })

  it('devuelve array vacío si no hay matches', () => {
    expect(resolveVehicles(['invalid-1', 'invalid-2'], vehicles)).toEqual([])
  })
})
