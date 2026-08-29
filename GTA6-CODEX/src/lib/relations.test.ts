import { describe, expect, it } from 'vitest'
import { EntityType, type EntityRelation, type Entity } from '@/types'
import {
  generateBreadcrumbFromRelations,
  getRelationLabel,
  groupRelationsByEntityType,
  groupRelationsByType,
  validateRelation,
} from '@/lib/relations'

function rel(overrides: Partial<EntityRelation> & Pick<EntityRelation, 'targetType' | 'targetSlug' | 'relation'>): EntityRelation {
  return { ...overrides }
}

describe('groupRelationsByType', () => {
  it('agrupa relaciones por su código de relación', () => {
    const relations: EntityRelation[] = [
      rel({ targetType: EntityType.VEHICLE, targetSlug: 'toyota-corolla', relation: 'ubicado_en' }),
      rel({ targetType: EntityType.VEHICLE, targetSlug: 'guia-ejemplo', relation: 'ubicado_en' }),
      rel({ targetType: EntityType.NEWS, targetSlug: 'noticia-ejemplo', relation: 'conducido_por' }),
    ]
    const grouped = groupRelationsByType(relations)
    expect(grouped.get('ubicado_en')).toHaveLength(2)
    expect(grouped.get('conducido_por')).toHaveLength(1)
    expect(grouped.size).toBe(2)
  })

  it('devuelve un Map vacío para lista vacía', () => {
    expect(groupRelationsByType([]).size).toBe(0)
  })
})

describe('groupRelationsByEntityType', () => {
  it('agrupa relaciones por el tipo de entidad objetivo', () => {
    const relations: EntityRelation[] = [
      rel({ targetType: EntityType.VEHICLE, targetSlug: 'toyota-corolla', relation: 'ubicado_en' }),
      rel({ targetType: EntityType.NEWS, targetSlug: 'noticia-ejemplo', relation: 'conducido_por' }),
      rel({ targetType: EntityType.NEWS, targetSlug: 'noticia-ejemplo-2', relation: 'conducido_por' }),
    ]
    const grouped = groupRelationsByEntityType(relations)
    expect(grouped.get(EntityType.NEWS)).toHaveLength(2)
    expect(grouped.get(EntityType.VEHICLE)).toHaveLength(1)
  })
})

describe('validateRelation', () => {
  const valid = rel({ targetType: EntityType.VEHICLE, targetSlug: 'toyota-corolla', relation: 'ubicado_en' })

  it('acepta una relación bien formada', () => {
    expect(validateRelation(valid)).toBe(true)
  })

  it('rechaza si falta targetSlug', () => {
    expect(validateRelation({ ...valid, targetSlug: '' })).toBe(false)
  })

  it('rechaza targetSlug compuesto solo por espacios', () => {
    expect(validateRelation({ ...valid, targetSlug: '   ' })).toBe(false)
  })

  it('rechaza si falta relation', () => {
    expect(validateRelation({ ...valid, relation: '' })).toBe(false)
  })

  it('rechaza un targetType que no exista en EntityType', () => {
    expect(validateRelation({ ...valid, targetType: 'inexistente' as EntityType })).toBe(false)
  })
})

describe('getRelationLabel', () => {
  it('traduce códigos conocidos a español', () => {
    expect(getRelationLabel('located_in')).toBe('Ubicado en')
    expect(getRelationLabel('works_for')).toBe('Trabaja para')
    expect(getRelationLabel('spouse_of')).toBe('Cónyuge de')
  })

  it('devuelve el código original si no hay mapeo', () => {
    expect(getRelationLabel('codigo_inexistente')).toBe('codigo_inexistente')
  })
})

describe('generateBreadcrumbFromRelations', () => {
  const entity: Entity = {
    slug: 'noticia-ejemplo-titular',
    type: EntityType.NEWS,
    title: 'Noticia Ejemplo',
    description: 'desc',
    status: 'confirmado',
    tags: [],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  } as Entity

  it('siempre incluye la entidad de origen primero', () => {
    const breadcrumb = generateBreadcrumbFromRelations(entity, [])
    expect(breadcrumb).toEqual([{ label: 'Noticia Ejemplo', type: EntityType.NEWS, slug: 'noticia-ejemplo-titular' }])
  })

  it('agrega como máximo 2 relaciones adicionales', () => {
    const relations: EntityRelation[] = [
      rel({ targetType: EntityType.VEHICLE, targetSlug: 'a', relation: 'r1' }),
      rel({ targetType: EntityType.VEHICLE, targetSlug: 'b', relation: 'r2' }),
      rel({ targetType: EntityType.VEHICLE, targetSlug: 'c', relation: 'r3' }),
    ]
    const breadcrumb = generateBreadcrumbFromRelations(entity, relations)
    expect(breadcrumb).toHaveLength(3) // origen + 2
    expect(breadcrumb.map((b) => b.slug)).toEqual(['noticia-ejemplo-titular', 'a', 'b'])
  })
})
