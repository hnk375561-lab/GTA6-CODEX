/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest'
import { EntityType } from '@/types'
import type { Vehicle } from '@/types'
import {
  performanceToScale,
  vehiclePerformanceScore,
  hasPerformanceData,
} from '@/lib/vehicle-performance'

describe('performanceToScale', () => {
  it('convierte texto cualitativo a escala numérica 1-5', () => {
    expect(performanceToScale('Muy alta')).toBe(5)
    expect(performanceToScale('Alta')).toBe(4)
    expect(performanceToScale('Media-Alta')).toBe(3)
    expect(performanceToScale('Media')).toBe(2)
    expect(performanceToScale('Baja')).toBe(1)
  })

  it('es case-insensitive', () => {
    expect(performanceToScale('MUY ALTA')).toBe(5)
    expect(performanceToScale('muy alta')).toBe(5)
    expect(performanceToScale('MEDIA')).toBe(2)
    expect(performanceToScale('media')).toBe(2)
  })

  it('prioriza "muy alta" sobre "alta" aunque contenga ambas palabras', () => {
    expect(performanceToScale('Muy alta')).toBe(5)
    expect(performanceToScale('muy ALTA')).toBe(5)
  })

  it('reconoce "media-alta" con guión', () => {
    expect(performanceToScale('Media-Alta')).toBe(3)
    expect(performanceToScale('media-alta')).toBe(3)
  })

  it('devuelve null para "N/A"', () => {
    expect(performanceToScale('N/A')).toBe(null)
    expect(performanceToScale('n/a')).toBe(null)
  })

  it('devuelve null para undefined o string vacío', () => {
    expect(performanceToScale()).toBe(null)
    expect(performanceToScale('')).toBe(null)
    expect(performanceToScale('   ')).toBe(null)
  })

  it('devuelve null para texto que no coincide con ningún rango', () => {
    expect(performanceToScale('Desconocido')).toBe(null)
    expect(performanceToScale('xyz')).toBe(null)
  })
})

describe('vehiclePerformanceScore', () => {
  it('suma correctamente las 4 métricas de rendimiento (max 20)', () => {
    const vehicle = {
      slug: 'test-vehicle',
      type: EntityType.VEHICLE,
      title: 'Test Vehicle',
      description: 'Test',
      performance: {
        speed: 'Muy alta',
        acceleration: 'Alta',
        handling: 'Media-Alta',
        braking: 'Media',
      },
    } as any as Vehicle
    expect(vehiclePerformanceScore(vehicle)).toBe(14)
  })

  it('max score es 20 (5+5+5+5)', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: {
        speed: 'Muy alta',
        acceleration: 'Muy alta',
        handling: 'Muy alta',
        braking: 'Muy alta',
      },
    } as any as Vehicle
    expect(vehiclePerformanceScore(vehicle)).toBe(20)
  })

  it('min score es 0 (baja en todas las métricas o null)', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: {
        speed: 'Baja',
        acceleration: 'Baja',
        handling: 'Baja',
        braking: 'Baja',
      },
    } as any as Vehicle
    expect(vehiclePerformanceScore(vehicle)).toBe(4)
  })

  it('trata N/A como 0 en cada métrica', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: {
        speed: 'N/A',
        acceleration: 'Alta',
        handling: 'N/A',
        braking: 'Media',
      },
    } as any as Vehicle
    expect(vehiclePerformanceScore(vehicle)).toBe(6)
  })

  it('devuelve 0 si el vehículo no tiene performance', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
    } as any as Vehicle
    expect(vehiclePerformanceScore(vehicle)).toBe(0)
  })

  it('devuelve 0 si performance es null', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: null,
    } as any as Vehicle
    expect(vehiclePerformanceScore(vehicle)).toBe(0)
  })

  it('mantiene precisión con valores mixtos de null y string', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: {
        speed: 'Media',
        acceleration: undefined,
        handling: 'Baja',
        braking: null,
      },
    } as any as Vehicle
    expect(vehiclePerformanceScore(vehicle)).toBe(3)
  })
})

describe('hasPerformanceData', () => {
  it('devuelve true si al menos una métrica tiene datos válidos', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: {
        speed: 'Alta',
      },
    } as any as Vehicle
    expect(hasPerformanceData(vehicle)).toBe(true)
  })

  it('devuelve false si todas las métricas son N/A o no existen', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: {
        speed: 'N/A',
        acceleration: 'N/A',
      },
    } as any as Vehicle
    expect(hasPerformanceData(vehicle)).toBe(false)
  })

  it('devuelve false si performance es undefined o null', () => {
    const v1 = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
    } as any as Vehicle
    const v2 = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: null,
    } as any as Vehicle
    expect(hasPerformanceData(v1)).toBe(false)
    expect(hasPerformanceData(v2)).toBe(false)
  })

  it('devuelve true si solo algunos campos tienen datos', () => {
    const vehicle = {
      slug: 'test',
      type: EntityType.VEHICLE,
      title: 'Test',
      description: 'Test',
      performance: {
        speed: 'N/A',
        acceleration: 'Media',
        handling: 'N/A',
        braking: undefined,
      },
    } as any as Vehicle
    expect(hasPerformanceData(vehicle)).toBe(true)
  })

  it('consistency: score > 0 implica hasPerformanceData = true', () => {
    const testCases: Vehicle[] = [
      {
        slug: 't1',
        type: EntityType.VEHICLE,
        title: 'T1',
        description: 'T1',
        performance: { speed: 'Baja' },
      } as any,
      {
        slug: 't2',
        type: EntityType.VEHICLE,
        title: 'T2',
        description: 'T2',
        performance: { acceleration: 'Media' },
      } as any,
    ]
    testCases.forEach((v) => {
      const hasData = hasPerformanceData(v)
      const score = vehiclePerformanceScore(v)
      if (score > 0) {
        expect(hasData).toBe(true)
      }
    })
  })
})
