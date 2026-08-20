import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EntityType, type Entity, type EntityRelation } from '@/types'

/**
 * `getBidirectionalRelations` / `detectCircularRelations` dependen de
 * `./entities` (getEntity, getEntitiesByType) que lee del filesystem.
 * Se mockea el módulo completo para testear la lógica de grafo en
 * aislamiento, con un pequeño dataset en memoria controlado por test.
 */
vi.mock('./entities', () => ({
  getEntity: vi.fn(),
  getEntitiesByType: vi.fn(),
}))

import { getEntity, getEntitiesByType } from './entities'
import {
  clearRelationCache,
  getBidirectionalRelations,
  getBidirectionalRelationCount,
  getBidirectionalRelatedEntitiesWithLabel,
  detectCircularRelations,
} from './relations'

const mockedGetEntity = vi.mocked(getEntity)
const mockedGetEntitiesByType = vi.mocked(getEntitiesByType)

function makeEntity(
  type: EntityType,
  slug: string,
  relations: EntityRelation[] = []
): Entity {
  return {
    slug,
    type,
    title: slug,
    description: 'desc',
    status: 'confirmado',
    tags: [],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    relations,
  } as Entity
}

function rel(targetType: EntityType, targetSlug: string, relation: string): EntityRelation {
  return { targetType, targetSlug, relation }
}

/**
 * Instala un dataset simple en los mocks: un Map "type/slug" -> Entity.
 * `getEntitiesByType` devuelve todas las entidades de ese tipo;
 * `getEntity` busca por clave exacta.
 */
function setupDataset(entities: Entity[]) {
  mockedGetEntity.mockImplementation(async (type: EntityType, slug: string) => {
    return entities.find((e) => e.type === type && e.slug === slug) ?? null
  })
  mockedGetEntitiesByType.mockImplementation(async (type: EntityType) => {
    return entities.filter((e) => e.type === type)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  clearRelationCache()
})

describe('getBidirectionalRelations', () => {
  it('incluye las relaciones directas de la entidad', async () => {
    const vice = makeEntity(EntityType.LOCATION, 'vice-city')
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'vice-city', 'ubicado_en'),
    ])
    setupDataset([vice, lucia])

    const result = await getBidirectionalRelations(lucia)
    expect(result).toEqual([rel(EntityType.LOCATION, 'vice-city', 'ubicado_en')])
  })

  it('infiere una relación inversa cuando otra entidad apunta a esta pero no al revés', async () => {
    // leonida (ubicación) no declara relations propias, pero 2 personajes
    // apuntan a ella con "ubicado_en" -> deben aparecer como inferidas.
    const leonida = makeEntity(EntityType.LOCATION, 'leonida')
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'leonida', 'ubicado_en'),
    ])
    const jason = makeEntity(EntityType.CHARACTER, 'jason', [
      rel(EntityType.LOCATION, 'leonida', 'ubicado_en'),
    ])
    setupDataset([leonida, lucia, jason])

    const result = await getBidirectionalRelations(leonida)
    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        { targetType: EntityType.CHARACTER, targetSlug: 'lucia', relation: 'ubicado_en', direction: 'from' },
        { targetType: EntityType.CHARACTER, targetSlug: 'jason', relation: 'ubicado_en', direction: 'from' },
      ])
    )
  })

  it('no duplica una relación inferida que ya está declarada explícitamente', async () => {
    const vice = makeEntity(EntityType.LOCATION, 'vice-city', [
      rel(EntityType.CHARACTER, 'lucia', 'aparece_en'),
    ])
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'vice-city', 'ubicado_en'),
    ])
    setupDataset([vice, lucia])

    const result = await getBidirectionalRelations(vice)
    // vice-city ya declara explícitamente la relación con lucia, así que
    // no debe agregarse una segunda vez como inferida.
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(rel(EntityType.CHARACTER, 'lucia', 'aparece_en'))
  })

  it('no se relaciona consigo misma aunque comparta type+slug', async () => {
    const self = makeEntity(EntityType.CHARACTER, 'lucia')
    setupDataset([self])

    const result = await getBidirectionalRelations(self)
    expect(result).toEqual([])
  })

  it('devuelve array vacío cuando no hay relaciones directas ni inferidas', async () => {
    const solo = makeEntity(EntityType.OBJECT, 'llavero')
    setupDataset([solo])

    const result = await getBidirectionalRelations(solo)
    expect(result).toEqual([])
  })

  it('cachea el resultado: la segunda llamada no vuelve a recorrer getEntitiesByType', async () => {
    const vice = makeEntity(EntityType.LOCATION, 'vice-city')
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'vice-city', 'ubicado_en'),
    ])
    setupDataset([vice, lucia])

    await getBidirectionalRelations(lucia)
    const callsAfterFirst = mockedGetEntitiesByType.mock.calls.length
    expect(callsAfterFirst).toBeGreaterThan(0)

    await getBidirectionalRelations(lucia)
    expect(mockedGetEntitiesByType.mock.calls.length).toBe(callsAfterFirst)
  })

  it('clearRelationCache invalida el caché y fuerza un recálculo', async () => {
    const vice = makeEntity(EntityType.LOCATION, 'vice-city')
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'vice-city', 'ubicado_en'),
    ])
    setupDataset([vice, lucia])

    await getBidirectionalRelations(lucia)
    const callsAfterFirst = mockedGetEntitiesByType.mock.calls.length

    clearRelationCache()
    await getBidirectionalRelations(lucia)
    expect(mockedGetEntitiesByType.mock.calls.length).toBeGreaterThan(callsAfterFirst)
  })
})

describe('getBidirectionalRelationCount', () => {
  it('cuenta relaciones directas + inferidas sin resolver entidades completas', async () => {
    const leonida = makeEntity(EntityType.LOCATION, 'leonida')
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'leonida', 'ubicado_en'),
    ])
    setupDataset([leonida, lucia])

    const count = await getBidirectionalRelationCount(leonida)
    expect(count).toBe(1)
  })

  it('devuelve 0 cuando no hay relaciones', async () => {
    const solo = makeEntity(EntityType.OBJECT, 'llavero')
    setupDataset([solo])

    expect(await getBidirectionalRelationCount(solo)).toBe(0)
  })
})

describe('getBidirectionalRelatedEntitiesWithLabel', () => {
  it('resuelve entidades relacionadas (directas e inferidas) con su label', async () => {
    const leonida = makeEntity(EntityType.LOCATION, 'leonida')
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'leonida', 'ubicado_en'),
    ])
    setupDataset([leonida, lucia])

    const result = await getBidirectionalRelatedEntitiesWithLabel(leonida)
    expect(result).toHaveLength(1)
    expect(result[0].entity.slug).toBe('lucia')
    expect(result[0].relation).toBe('ubicado_en')
  })

  it('omite relaciones cuyo target no existe (entidad borrada/rota)', async () => {
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'ciudad-inexistente', 'ubicado_en'),
    ])
    setupDataset([lucia])

    const result = await getBidirectionalRelatedEntitiesWithLabel(lucia)
    expect(result).toEqual([])
  })

  it('respeta el límite pasado como parámetro', async () => {
    const vice = makeEntity(EntityType.LOCATION, 'vice-city')
    const leonida = makeEntity(EntityType.LOCATION, 'leonida')
    const lucia = makeEntity(EntityType.CHARACTER, 'lucia', [
      rel(EntityType.LOCATION, 'vice-city', 'ubicado_en'),
      rel(EntityType.LOCATION, 'leonida', 'aparece_en'),
    ])
    setupDataset([vice, leonida, lucia])

    const result = await getBidirectionalRelatedEntitiesWithLabel(lucia, 1)
    expect(result).toHaveLength(1)
  })
})

describe('detectCircularRelations', () => {
  it('detecta una auto-referencia directa (A -> A)', async () => {
    const a = makeEntity(EntityType.CHARACTER, 'a', [
      rel(EntityType.CHARACTER, 'a', 'amigo_de'),
    ])
    setupDataset([a])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([rel(EntityType.CHARACTER, 'a', 'amigo_de')])
  })

  it('detecta un ciclo corto A -> B -> A', async () => {
    const a = makeEntity(EntityType.CHARACTER, 'a', [
      rel(EntityType.CHARACTER, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.CHARACTER, 'b', [
      rel(EntityType.CHARACTER, 'a', 'amigo_de'),
    ])
    setupDataset([a, b])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([rel(EntityType.CHARACTER, 'b', 'amigo_de')])
  })

  it('detecta un ciclo más largo A -> B -> C -> A dentro de maxDepth', async () => {
    const a = makeEntity(EntityType.CHARACTER, 'a', [
      rel(EntityType.CHARACTER, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.CHARACTER, 'b', [
      rel(EntityType.CHARACTER, 'c', 'amigo_de'),
    ])
    const c = makeEntity(EntityType.CHARACTER, 'c', [
      rel(EntityType.CHARACTER, 'a', 'amigo_de'),
    ])
    setupDataset([a, b, c])

    const circular = await detectCircularRelations(a, 5)
    expect(circular).toEqual([rel(EntityType.CHARACTER, 'b', 'amigo_de')])
  })

  it('no reporta ciclo si el camino de vuelta excede maxDepth', async () => {
    const a = makeEntity(EntityType.CHARACTER, 'a', [
      rel(EntityType.CHARACTER, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.CHARACTER, 'b', [
      rel(EntityType.CHARACTER, 'c', 'amigo_de'),
    ])
    const c = makeEntity(EntityType.CHARACTER, 'c', [
      rel(EntityType.CHARACTER, 'a', 'amigo_de'),
    ])
    setupDataset([a, b, c])

    // El ciclo A->B->C->A requiere 2 saltos adicionales desde B; con
    // maxDepth=1 no debería alcanzar a encontrar el camino de vuelta.
    const circular = await detectCircularRelations(a, 1)
    expect(circular).toEqual([])
  })

  it('no reporta ciclo cuando las relaciones forman un camino sin retorno (DAG)', async () => {
    const a = makeEntity(EntityType.CHARACTER, 'a', [
      rel(EntityType.CHARACTER, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.CHARACTER, 'b', [
      rel(EntityType.CHARACTER, 'c', 'amigo_de'),
    ])
    const c = makeEntity(EntityType.CHARACTER, 'c')
    setupDataset([a, b, c])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([])
  })

  it('devuelve array vacío cuando la entidad no tiene relations', async () => {
    const solo = makeEntity(EntityType.OBJECT, 'llavero')
    setupDataset([solo])

    expect(await detectCircularRelations(solo)).toEqual([])
  })

  it('no entra en loop infinito con un ciclo que no incluye al nodo de partida', async () => {
    // a -> b -> c -> b (ciclo entre b y c, sin volver nunca a "a").
    // El DFS debe cortar por `visited` y terminar sin colgarse.
    const a = makeEntity(EntityType.CHARACTER, 'a', [
      rel(EntityType.CHARACTER, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.CHARACTER, 'b', [
      rel(EntityType.CHARACTER, 'c', 'amigo_de'),
    ])
    const c = makeEntity(EntityType.CHARACTER, 'c', [
      rel(EntityType.CHARACTER, 'b', 'amigo_de'),
    ])
    setupDataset([a, b, c])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([])
  })

  it('evalúa cada relación directa de forma independiente (una en ciclo, otra no)', async () => {
    const a = makeEntity(EntityType.CHARACTER, 'a', [
      rel(EntityType.CHARACTER, 'a', 'amigo_de'), // auto-referencia: ciclo
      rel(EntityType.CHARACTER, 'd', 'amigo_de'), // sin retorno: no es ciclo
    ])
    const d = makeEntity(EntityType.CHARACTER, 'd')
    setupDataset([a, d])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([rel(EntityType.CHARACTER, 'a', 'amigo_de')])
  })
})
