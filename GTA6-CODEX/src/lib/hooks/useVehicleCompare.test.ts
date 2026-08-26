// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { MAX_COMPARE } from '@/components/entities/VehicleCompareSheet'
import { useVehicleCompare } from '@/lib/hooks/useVehicleCompare'

function makeVehicle(slug: string, title: string): Vehicle {
  return {
    type: EntityType.VEHICLE,
    slug,
    title,
    description: 'Descripción de prueba',
    status: 'confirmado',
    tags: [],
    featured: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  } as Vehicle
}

const entities: Entity[] = [
  makeVehicle('a', 'Vehículo A'),
  makeVehicle('b', 'Vehículo B'),
  makeVehicle('c', 'Vehículo C'),
  makeVehicle('d', 'Vehículo D'),
  makeVehicle('e', 'Vehículo E'),
  makeVehicle('f', 'Vehículo F'),
]

describe('useVehicleCompare', () => {
  it('arranca sin selección ni panel abierto', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    expect(result.current.compareSlugs).toEqual([])
    expect(result.current.compareOpen).toBe(false)
    expect(result.current.compareVehicles).toEqual([])
  })

  it('toggleCompare agrega un slug', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    act(() => result.current.toggleCompare('a'))
    expect(result.current.compareSlugs).toEqual(['a'])
  })

  it('toggleCompare sobre un slug ya seleccionado lo saca', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    act(() => result.current.toggleCompare('a'))
    act(() => result.current.toggleCompare('a'))
    expect(result.current.compareSlugs).toEqual([])
  })

  it('respeta el tope MAX_COMPARE: el slug de más no entra', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    for (const slug of ['a', 'b', 'c', 'd', 'e', 'f']) {
      act(() => result.current.toggleCompare(slug))
    }
    expect(result.current.compareSlugs).toHaveLength(MAX_COMPARE)
    // El sexto (f) no entró — ya estaban ocupados los MAX_COMPARE lugares.
    expect(result.current.compareSlugs).not.toContain('f')
  })

  it('un slug ya seleccionado se puede sacar aunque el tope esté lleno', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    for (const slug of ['a', 'b', 'c', 'd', 'e']) {
      act(() => result.current.toggleCompare(slug))
    }
    act(() => result.current.toggleCompare('a')) // saca 'a', que sí estaba adentro
    expect(result.current.compareSlugs).toEqual(['b', 'c', 'd', 'e'])
  })

  it('removeCompare saca un slug puntual sin tocar el resto', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    act(() => result.current.toggleCompare('a'))
    act(() => result.current.toggleCompare('b'))
    act(() => result.current.removeCompare('a'))
    expect(result.current.compareSlugs).toEqual(['b'])
  })

  it('clearCompare vacía la selección y cierra el panel', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    act(() => result.current.toggleCompare('a'))
    act(() => result.current.setCompareOpen(true))
    act(() => result.current.clearCompare())
    expect(result.current.compareSlugs).toEqual([])
    expect(result.current.compareOpen).toBe(false)
  })

  it('setCompareOpen abre y cierra el panel', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    act(() => result.current.setCompareOpen(true))
    expect(result.current.compareOpen).toBe(true)
    act(() => result.current.setCompareOpen(false))
    expect(result.current.compareOpen).toBe(false)
  })

  it('compareVehicles deriva los objetos Vehicle completos, en el orden de selección', () => {
    const { result } = renderHook(() => useVehicleCompare(entities))
    act(() => result.current.toggleCompare('c'))
    act(() => result.current.toggleCompare('a'))
    expect(result.current.compareVehicles.map((v) => v.slug)).toEqual(['c', 'a'])
    expect(result.current.compareVehicles.map((v) => v.title)).toEqual(['Vehículo C', 'Vehículo A'])
  })

  it('un slug seleccionado que ya no existe en entities se filtra de compareVehicles', () => {
    const { result, rerender } = renderHook(({ ents }) => useVehicleCompare(ents), {
      initialProps: { ents: entities },
    })
    act(() => result.current.toggleCompare('a'))
    act(() => result.current.toggleCompare('b'))
    // El slug sigue en compareSlugs (estado propio del hook), pero si la
    // lista de entities cambia (ej. resultado de un filtro) y 'a' ya no
    // está, compareVehicles no debe inventar un Vehicle para ese slug.
    rerender({ ents: entities.filter((e) => e.slug !== 'a') })
    expect(result.current.compareSlugs).toEqual(['a', 'b'])
    expect(result.current.compareVehicles.map((v) => v.slug)).toEqual(['b'])
  })
})
