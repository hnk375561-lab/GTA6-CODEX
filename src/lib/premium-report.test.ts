import { describe, expect, it } from 'vitest'
import {
  PREMIUM_REPORT_MAX_VEHICLES,
  PREMIUM_REPORT_MIN_VEHICLES,
  buildExternalReference,
  externalReferenceMatchesSlugs,
  isValidSlugSelection,
  normalizeSlugs,
} from './premium-report'

describe('normalizeSlugs', () => {
  it('ordena, deduplica y descarta strings vacíos', () => {
    expect(normalizeSlugs(['b', 'a', 'a', '', '  '])).toEqual(['a', 'b'])
  })

  it('recorta espacios antes de comparar', () => {
    expect(normalizeSlugs([' a ', 'a'])).toEqual(['a'])
  })
})

describe('isValidSlugSelection', () => {
  it('rechaza menos del mínimo', () => {
    expect(isValidSlugSelection(['a'])).toBe(false)
  })

  it('acepta el mínimo y el máximo', () => {
    const min = Array.from({ length: PREMIUM_REPORT_MIN_VEHICLES }, (_, i) => `v${i}`)
    const max = Array.from({ length: PREMIUM_REPORT_MAX_VEHICLES }, (_, i) => `v${i}`)
    expect(isValidSlugSelection(min)).toBe(true)
    expect(isValidSlugSelection(max)).toBe(true)
  })

  it('rechaza más del máximo', () => {
    const overMax = Array.from({ length: PREMIUM_REPORT_MAX_VEHICLES + 1 }, (_, i) => `v${i}`)
    expect(isValidSlugSelection(overMax)).toBe(false)
  })
})

describe('buildExternalReference / externalReferenceMatchesSlugs', () => {
  it('el orden de los slugs de entrada no cambia la referencia', () => {
    expect(buildExternalReference(['b', 'a'])).toBe(buildExternalReference(['a', 'b']))
  })

  it('matchea solo la selección exacta que generó el pago', () => {
    const ref = buildExternalReference(['toyota-corolla', 'honda-civic'])
    expect(externalReferenceMatchesSlugs(ref, ['honda-civic', 'toyota-corolla'])).toBe(true)
    expect(externalReferenceMatchesSlugs(ref, ['toyota-corolla'])).toBe(false)
    expect(externalReferenceMatchesSlugs(ref, ['toyota-corolla', 'otro-auto'])).toBe(false)
  })

  it('devuelve false para una referencia nula', () => {
    expect(externalReferenceMatchesSlugs(null, ['a', 'b'])).toBe(false)
  })
})
