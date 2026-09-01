import { describe, expect, it } from 'vitest'
import { getBestValueIndices } from '@/lib/vehicle-compare-best'

describe('getBestValueIndices', () => {
  it('destaca el índice con el valor mínimo cuando direction=min', () => {
    const result = getBestValueIndices([34900, 22000, 41000], 'min')
    expect(result).toEqual(new Set([1]))
  })

  it('destaca el índice con el valor máximo cuando direction=max', () => {
    const result = getBestValueIndices([3, 5, 2], 'max')
    expect(result).toEqual(new Set([1]))
  })

  it('destaca todos los índices empatados en el mejor valor', () => {
    const result = getBestValueIndices([5, 5, 2], 'max')
    expect(result).toEqual(new Set([0, 1]))
  })

  it('ignora los valores null al calcular el mejor', () => {
    const result = getBestValueIndices([null, 22000, 41000], 'min')
    expect(result).toEqual(new Set([1]))
  })

  it('devuelve set vacío si hay menos de 2 valores parseables', () => {
    expect(getBestValueIndices([null, null, 30000], 'min')).toEqual(new Set())
    expect(getBestValueIndices([], 'min')).toEqual(new Set())
  })

  it('devuelve set vacío si todos los valores parseables son iguales (empate total)', () => {
    const result = getBestValueIndices([4, 4, 4], 'max')
    expect(result).toEqual(new Set())
  })

  it('devuelve set vacío con un único valor parseable', () => {
    const result = getBestValueIndices([null, 30000, null], 'min')
    expect(result).toEqual(new Set())
  })
})
