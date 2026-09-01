import { describe, it, expect } from 'vitest'
import {
  getVehicleEquipment,
  getAllEquipmentNames,
  getEquipmentStatus,
  getVehicleEquipmentMatrix,
} from './vehicle-compare-equipment'
import type { Vehicle } from '@/types'

describe('getVehicleEquipment', () => {
  const baseVehicle: Partial<Vehicle> = {}

  it('devuelve null si no existe equipamiento', () => {
    const v = { ...baseVehicle } as Vehicle
    expect(getVehicleEquipment(v)).toBeNull()
  })

  it('devuelve null si equipamiento es array vacío', () => {
    const v = { ...baseVehicle, equipamiento: [] } as Vehicle
    expect(getVehicleEquipment(v)).toBeNull()
  })

  it('devuelve array de equipamiento válido', () => {
    const v = { ...baseVehicle, equipamiento: ['Techo solar', 'Apple CarPlay'] } as Vehicle
    expect(getVehicleEquipment(v)).toEqual(['Techo solar', 'Apple CarPlay'])
  })

  it('filtra strings vacíos del array', () => {
    const v = { ...baseVehicle, equipamiento: ['Techo solar', '', '  ', 'Apple CarPlay'] } as Vehicle
    const result = getVehicleEquipment(v)
    expect(result).toEqual(['Techo solar', 'Apple CarPlay'])
  })

  it('filtra items no-string', () => {
    const v = {
      ...baseVehicle,
      equipamiento: ['Techo solar', null, 'Apple CarPlay', undefined] as unknown as string[],
    } as Vehicle
    const result = getVehicleEquipment(v)
    expect(result).toContain('Techo solar')
    expect(result).toContain('Apple CarPlay')
  })
})

describe('getAllEquipmentNames', () => {
  it('recolecta equipamiento único de múltiples vehículos', () => {
    const vehicles = [
      { equipamiento: ['Techo solar', 'Apple CarPlay'] } as Vehicle,
      { equipamiento: ['Android Auto', 'Apple CarPlay'] } as Vehicle,
      { equipamiento: ['Techo solar'] } as Vehicle,
    ]
    const result = getAllEquipmentNames(vehicles)
    expect(result).toContain('Techo solar')
    expect(result).toContain('Apple CarPlay')
    expect(result).toContain('Android Auto')
    expect(result.length).toBe(3)
  })

  it('ordena alfabéticamente', () => {
    const vehicles = [
      { equipamiento: ['Zebra'] } as Vehicle,
      { equipamiento: ['Apple'] } as Vehicle,
      { equipamiento: ['Melon'] } as Vehicle,
    ]
    const result = getAllEquipmentNames(vehicles)
    expect(result).toEqual(['Apple', 'Melon', 'Zebra'])
  })

  it('devuelve array vacío si no hay equipamiento', () => {
    const vehicles = [{} as Vehicle, {} as Vehicle]
    const result = getAllEquipmentNames(vehicles)
    expect(result).toEqual([])
  })

  it('deduplicaa equipamiento repetido', () => {
    const vehicles = [
      { equipamiento: ['Techo solar', 'Techo solar'] } as Vehicle,
      { equipamiento: ['Techo solar'] } as Vehicle,
    ]
    const result = getAllEquipmentNames(vehicles)
    expect(result).toEqual(['Techo solar'])
  })
})

describe('getEquipmentStatus', () => {
  const baseVehicle: Partial<Vehicle> = {}

  it('devuelve "unknown" si el vehículo no tiene equipamiento', () => {
    const v = { ...baseVehicle } as Vehicle
    expect(getEquipmentStatus(v, 'Techo solar')).toBe('unknown')
  })

  it('devuelve "present" si el equipamiento está en la lista', () => {
    const v = { ...baseVehicle, equipamiento: ['Techo solar', 'Apple CarPlay'] } as Vehicle
    expect(getEquipmentStatus(v, 'Techo solar')).toBe('present')
  })

  it('devuelve "absent" si el equipamiento no está en la lista', () => {
    const v = { ...baseVehicle, equipamiento: ['Techo solar', 'Apple CarPlay'] } as Vehicle
    expect(getEquipmentStatus(v, 'Android Auto')).toBe('absent')
  })

  it('es case-insensitive', () => {
    const v = { ...baseVehicle, equipamiento: ['Techo Solar', 'APPLE CARPLAY'] } as Vehicle
    expect(getEquipmentStatus(v, 'techo solar')).toBe('present')
    expect(getEquipmentStatus(v, 'apple carplay')).toBe('present')
  })
})

describe('getVehicleEquipmentMatrix', () => {
  it('arma matriz con todos los equipamientos', () => {
    const v = { equipamiento: ['Techo solar', 'Apple CarPlay'] } as Vehicle
    const allNames = ['Techo solar', 'Apple CarPlay', 'Android Auto']
    const result = getVehicleEquipmentMatrix(v, allNames)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ name: 'Techo solar', status: 'present' })
    expect(result[1]).toEqual({ name: 'Apple CarPlay', status: 'present' })
    expect(result[2]).toEqual({ name: 'Android Auto', status: 'absent' })
  })

  it('devuelve "unknown" cuando el vehículo no tiene equipamiento', () => {
    const v = {} as Vehicle
    const allNames = ['Techo solar', 'Apple CarPlay']
    const result = getVehicleEquipmentMatrix(v, allNames)

    expect(result).toHaveLength(2)
    result.forEach((item) => {
      expect(item.status).toBe('unknown')
    })
  })
})
