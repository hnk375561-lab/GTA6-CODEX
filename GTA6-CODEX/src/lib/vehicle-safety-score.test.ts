import { describe, it, expect } from 'vitest'
import { parseSafetyScore, getSafetyInfo } from './vehicle-safety-score'
import type { Vehicle } from '@/types'

describe('parseSafetyScore', () => {
  const baseVehicle: Partial<Vehicle> = {}

  it('devuelve null si no existe safety', () => {
    const v = { ...baseVehicle } as Vehicle
    expect(parseSafetyScore(v)).toBeNull()
  })

  it('devuelve null si safety es undefined', () => {
    const v = { ...baseVehicle, safety: undefined } as Vehicle
    expect(parseSafetyScore(v)).toBeNull()
  })

  it('devuelve null si safety.puntaje es undefined', () => {
    const v = { ...baseVehicle, safety: {} } as Vehicle
    expect(parseSafetyScore(v)).toBeNull()
  })

  it('parsea puntaje numérico válido', () => {
    const v = { ...baseVehicle, safety: { puntaje: 5 } } as Vehicle
    expect(parseSafetyScore(v)).toBe(5)
  })

  it('parsea puntaje en rango 1-5', () => {
    const cases = [1, 2, 3, 4, 5]
    cases.forEach((score) => {
      const v = { ...baseVehicle, safety: { puntaje: score } } as Vehicle
      expect(parseSafetyScore(v)).toBe(score)
    })
  })

  it('parsea puntaje string válido', () => {
    const v = { ...baseVehicle, safety: { puntaje: '4' as unknown as number } } as Vehicle
    expect(parseSafetyScore(v)).toBe(4)
  })

  it('parsea puntaje decimal', () => {
    const v = { ...baseVehicle, safety: { puntaje: 4.5 } } as Vehicle
    expect(parseSafetyScore(v)).toBe(4.5)
  })

  it('devuelve null si puntaje es menor a 1', () => {
    const v = { ...baseVehicle, safety: { puntaje: 0 } } as Vehicle
    expect(parseSafetyScore(v)).toBeNull()
  })

  it('devuelve null si puntaje es mayor a 5', () => {
    const v = { ...baseVehicle, safety: { puntaje: 6 } } as Vehicle
    expect(parseSafetyScore(v)).toBeNull()
  })

  it('devuelve null si puntaje es NaN', () => {
    const v = { ...baseVehicle, safety: { puntaje: NaN as unknown as number } } as Vehicle
    expect(parseSafetyScore(v)).toBeNull()
  })
})

describe('getSafetyInfo', () => {
  const baseVehicle: Partial<Vehicle> = {}

  it('devuelve null si no hay score válido', () => {
    const v = { ...baseVehicle } as Vehicle
    expect(getSafetyInfo(v)).toBeNull()
  })

  it('retorna información de seguridad con euroNCAP', () => {
    const v = {
      ...baseVehicle,
      safety: { puntaje: 5, euroNCAP: 'Euro NCAP' },
    } as Vehicle
    const info = getSafetyInfo(v)
    expect(info).not.toBeNull()
    expect(info?.score).toBe(5)
    expect(info?.system).toBe('Euro NCAP')
    expect(info?.raw).toBe('5 estrellas Euro NCAP')
  })

  it('retorna información de seguridad sin euroNCAP (fallback)', () => {
    const v = { ...baseVehicle, safety: { puntaje: 4 } } as Vehicle
    const info = getSafetyInfo(v)
    expect(info).not.toBeNull()
    expect(info?.score).toBe(4)
    expect(info?.system).toBe('Euro NCAP')
    expect(info?.raw).toBe('4 estrellas Euro NCAP')
  })
})
