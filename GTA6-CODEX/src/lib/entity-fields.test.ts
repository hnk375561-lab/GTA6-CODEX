import { describe, expect, it } from 'vitest'
import { BaseEntitySchema } from '@/types/schemas'
import {
  RESERVED_ENTITY_KEYS,
  collectGenericFields,
  getGenericQuickFacts,
  humanizeKey,
} from '@/lib/entity-fields'

describe('RESERVED_ENTITY_KEYS', () => {
  it('coincide exactamente con las claves de BaseEntitySchema', () => {
    // Esta es la garantía real que necesita entity-fields.ts: si alguien
    // agrega/quita un campo en BaseEntitySchema (src/types/schemas.ts) sin
    // actualizar RESERVED_ENTITY_KEYS, collectGenericFields empezaría a
    // tratar un campo del contrato base como si fuera un campo "propio"
    // (o viceversa) — este test falla antes de que eso llegue a producción.
    const schemaKeys = new Set(Object.keys(BaseEntitySchema.shape))
    expect(RESERVED_ENTITY_KEYS).toEqual(schemaKeys)
  })
})

describe('humanizeKey', () => {
  it('convierte snake_case a texto legible con mayúscula inicial', () => {
    expect(humanizeKey('voice_actor')).toBe('Voice actor')
    expect(humanizeKey('mission_type')).toBe('Mission type')
    expect(humanizeKey('driven_by')).toBe('Driven by')
  })

  it('también normaliza guiones medios', () => {
    expect(humanizeKey('foo-bar-baz')).toBe('Foo bar baz')
  })

  it('devuelve la key tal cual si queda vacía tras limpiar separadores', () => {
    expect(humanizeKey('___')).toBe('___')
  })

  it('no rompe con una key de una sola palabra', () => {
    expect(humanizeKey('class')).toBe('Class')
  })
})

describe('collectGenericFields', () => {
  it('ignora las claves reservadas de BaseEntity', () => {
    const entity = {
      slug: 'x',
      type: 'armas',
      title: 'Pistola',
      description: 'desc',
      manufacturer: 'Ammu-Nation',
    }
    const fields = collectGenericFields(entity)
    expect(fields).toEqual([{ label: 'Manufacturer', kind: 'text', value: 'Ammu-Nation' }])
  })

  it('ignora valores null, undefined y strings vacíos', () => {
    const entity = { a: null, b: undefined, c: '   ', d: 'valor real' }
    expect(collectGenericFields(entity)).toEqual([{ label: 'D', kind: 'text', value: 'valor real' }])
  })

  it('convierte números y booleanos a texto', () => {
    const entity = { precio: 500, disponible: true }
    expect(collectGenericFields(entity)).toEqual([
      { label: 'Precio', kind: 'text', value: '500' },
      { label: 'Disponible', kind: 'text', value: 'true' },
    ])
  })

  it('trata arrays de strings no vacíos como campo tipo "list"', () => {
    const entity = { alias: ['El Rata', 'Ratita'], vacio: [] }
    expect(collectGenericFields(entity)).toEqual([
      { label: 'Alias', kind: 'list', value: ['El Rata', 'Ratita'] },
    ])
  })

  it('filtra entradas no-string de un array antes de decidir si está vacío', () => {
    const entity = { mixto: [1, 2, null] as unknown as string[] }
    expect(collectGenericFields(entity as unknown as Record<string, unknown>)).toEqual([])
  })

  it('aplana un nivel de objeto anidado', () => {
    const entity = {
      appearance: { age: '30s', height: '1.80m', empty: '' },
    }
    expect(collectGenericFields(entity)).toEqual([
      { label: 'Age', kind: 'text', value: '30s' },
      { label: 'Height', kind: 'text', value: '1.80m' },
    ])
  })

  it('respeta el orden de declaración de las claves en el objeto', () => {
    const entity = { zeta: 'z', alfa: 'a', beta: 'b' }
    expect(collectGenericFields(entity).map((f) => f.label)).toEqual(['Zeta', 'Alfa', 'Beta'])
  })
})

describe('getGenericQuickFacts', () => {
  it('devuelve solo campos de tipo texto, nunca listas', () => {
    const entity = { manufacturer: 'Vapid', class: 'sedan', tags_extra: ['a', 'b'] }
    const facts = getGenericQuickFacts(entity)
    expect(facts.every((f) => typeof f.value === 'string')).toBe(true)
    expect(facts.some((f) => f.label === 'Tags extra')).toBe(false)
  })

  it('respeta el límite pasado (default 2)', () => {
    const entity = { a: '1', b: '2', c: '3', d: '4' }
    expect(getGenericQuickFacts(entity)).toHaveLength(2)
    expect(getGenericQuickFacts(entity, 3)).toHaveLength(3)
    expect(getGenericQuickFacts(entity, 0)).toHaveLength(0)
  })

  it('devuelve vacío si la entidad no tiene campos propios', () => {
    expect(getGenericQuickFacts({ slug: 'x', title: 'Y' })).toEqual([])
  })
})
