import { describe, expect, it } from 'vitest'
import {
  buildExternalReference,
  decodeFlyerData,
  encodeFlyerData,
  externalReferenceMatchesData,
  isValidFlyerData,
  type FlyerData,
} from './for-sale-flyer'

const BASE: FlyerData = {
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: '2019',
  precio: 'USD 15.000',
  km: '60.000 km',
  contacto: '+54 9 3442 000000',
  ubicacion: 'Concepción del Uruguay',
}

describe('isValidFlyerData', () => {
  it('acepta datos con todos los campos obligatorios', () => {
    expect(isValidFlyerData(BASE)).toBe(true)
  })

  it('rechaza si falta un campo obligatorio', () => {
    const { contacto: _contacto, ...rest } = BASE
    expect(isValidFlyerData(rest)).toBe(false)
  })

  it('rechaza strings vacíos aunque la clave exista', () => {
    expect(isValidFlyerData({ ...BASE, marca: '  ' })).toBe(false)
  })

  it('no requiere km ni ubicación', () => {
    const { km: _km, ubicacion: _ubicacion, ...rest } = BASE
    expect(isValidFlyerData(rest)).toBe(true)
  })
})

describe('buildExternalReference / externalReferenceMatchesData', () => {
  it('es determinístico para los mismos datos', () => {
    expect(buildExternalReference(BASE)).toBe(buildExternalReference({ ...BASE }))
  })

  it('cambia si cambia cualquier campo', () => {
    expect(buildExternalReference(BASE)).not.toBe(buildExternalReference({ ...BASE, precio: 'USD 16.000' }))
  })

  it('matchea solo los datos exactos que generaron el pago', () => {
    const ref = buildExternalReference(BASE)
    expect(externalReferenceMatchesData(ref, BASE)).toBe(true)
    expect(externalReferenceMatchesData(ref, { ...BASE, precio: 'USD 1' })).toBe(false)
  })

  it('devuelve false para una referencia nula', () => {
    expect(externalReferenceMatchesData(null, BASE)).toBe(false)
  })
})

describe('encodeFlyerData / decodeFlyerData', () => {
  it('hace roundtrip completo', () => {
    const encoded = encodeFlyerData(BASE)
    expect(decodeFlyerData(encoded)).toEqual({
      marca: BASE.marca,
      modelo: BASE.modelo,
      anio: BASE.anio,
      precio: BASE.precio,
      km: BASE.km,
      contacto: BASE.contacto,
      ubicacion: BASE.ubicacion,
    })
  })

  it('devuelve null ante un string corrupto', () => {
    expect(decodeFlyerData('esto-no-es-base64-json-valido!!')).toBeNull()
  })
})
