import { describe, it, expect } from 'vitest'
import { parseTrunkVolume } from './vehicle-trunk'
import type { Vehicle } from '@/types'

describe('parseTrunkVolume', () => {
  const baseVehicle: Partial<Vehicle> = {}

  it('devuelve null si no existe baul', () => {
    const v = { ...baseVehicle } as Vehicle
    expect(parseTrunkVolume(v)).toBeNull()
  })

  it('devuelve null si baul es null', () => {
    const v = { ...baseVehicle, baul: null } as Vehicle
    expect(parseTrunkVolume(v)).toBeNull()
  })

  it('parsea baul numérico directamente', () => {
    const v = { ...baseVehicle, baul: 280 } as Vehicle
    expect(parseTrunkVolume(v)).toBe(280)
  })

  it('parsea baul string numérico limpio', () => {
    const v = { ...baseVehicle, baul: '280' } as Vehicle
    expect(parseTrunkVolume(v)).toBe(280)
  })

  it('parsea baul string con decimales', () => {
    const v = { ...baseVehicle, baul: '280.5' } as Vehicle
    expect(parseTrunkVolume(v)).toBe(280.5)
  })

  it('devuelve null si baul es 0 o negativo', () => {
    expect(parseTrunkVolume({ ...baseVehicle, baul: 0 } as Vehicle)).toBeNull()
    expect(parseTrunkVolume({ ...baseVehicle, baul: -100 } as Vehicle)).toBeNull()
  })

  it('devuelve null si baul contiene texto heterogéneo', () => {
    const cases = ['280-480 l', '280 litros', 'variable', '~280', 'desde 280']
    cases.forEach((baul) => {
      expect(parseTrunkVolume({ ...baseVehicle, baul } as Vehicle)).toBeNull()
    })
  })

  it('ignora espacios en blanco', () => {
    const v = { ...baseVehicle, baul: '  280  ' } as Vehicle
    expect(parseTrunkVolume(v)).toBe(280)
  })

  it('devuelve null si baul string no es válido numérico', () => {
    const v = { ...baseVehicle, baul: 'NaN' } as Vehicle
    expect(parseTrunkVolume(v)).toBeNull()
  })
})
