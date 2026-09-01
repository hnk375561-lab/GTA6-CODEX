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
    const vehiculoEjemplo = makeEntity(EntityType.VEHICLE, 'toyota-corolla')
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'toyota-corolla', 'ubicado_en'),
    ])
    setupDataset([vehiculoEjemplo, noticiaEjemplo])

    const result = await getBidirectionalRelations(noticiaEjemplo)
    expect(result).toEqual([rel(EntityType.VEHICLE, 'toyota-corolla', 'ubicado_en')])
  })

  it('infiere una relación inversa cuando otra entidad apunta a esta pero no al revés', async () => {
    // guiaEjemplo (ubicación) no declara relations propias, pero 2 noticias
    // apuntan a ella con "ubicado_en" -> deben aparecer como inferidas.
    const guiaEjemplo = makeEntity(EntityType.VEHICLE, 'guia-ejemplo')
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'guia-ejemplo', 'ubicado_en'),
    ])
    const noticiaEjemplo2 = makeEntity(EntityType.NEWS, 'noticia-ejemplo-2', [
      rel(EntityType.VEHICLE, 'guia-ejemplo', 'ubicado_en'),
    ])
    setupDataset([guiaEjemplo, noticiaEjemplo, noticiaEjemplo2])

    const result = await getBidirectionalRelations(guiaEjemplo)
    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        { targetType: EntityType.NEWS, targetSlug: 'noticia-ejemplo', relation: 'ubicado_en', direction: 'from' },
        { targetType: EntityType.NEWS, targetSlug: 'noticia-ejemplo-2', relation: 'ubicado_en', direction: 'from' },
      ])
    )
  })

  it('no duplica una relación inferida que ya está declarada explícitamente', async () => {
    const vehiculoEjemplo = makeEntity(EntityType.VEHICLE, 'toyota-corolla', [
      rel(EntityType.NEWS, 'noticia-ejemplo', 'aparece_en'),
    ])
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'toyota-corolla', 'ubicado_en'),
    ])
    setupDataset([vehiculoEjemplo, noticiaEjemplo])

    const result = await getBidirectionalRelations(vehiculoEjemplo)
    // vehiculoEjemplo ya declara explícitamente la relación con noticiaEjemplo, así que
    // no debe agregarse una segunda vez como inferida.
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(rel(EntityType.NEWS, 'noticia-ejemplo', 'aparece_en'))
  })

  it('no se relaciona consigo misma aunque comparta type+slug', async () => {
    const self = makeEntity(EntityType.NEWS, 'noticia-ejemplo')
    setupDataset([self])

    const result = await getBidirectionalRelations(self)
    expect(result).toEqual([])
  })

  it('devuelve array vacío cuando no hay relaciones directas ni inferidas', async () => {
    const solo = makeEntity(EntityType.GUIDE, 'guia-suelta')
    setupDataset([solo])

    const result = await getBidirectionalRelations(solo)
    expect(result).toEqual([])
  })

  it('cachea el resultado: la segunda llamada no vuelve a recorrer getEntitiesByType', async () => {
    const vehiculoEjemplo = makeEntity(EntityType.VEHICLE, 'toyota-corolla')
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'toyota-corolla', 'ubicado_en'),
    ])
    setupDataset([vehiculoEjemplo, noticiaEjemplo])

    await getBidirectionalRelations(noticiaEjemplo)
    const callsAfterFirst = mockedGetEntitiesByType.mock.calls.length
    expect(callsAfterFirst).toBeGreaterThan(0)

    await getBidirectionalRelations(noticiaEjemplo)
    expect(mockedGetEntitiesByType.mock.calls.length).toBe(callsAfterFirst)
  })

  it('clearRelationCache invalida el caché y fuerza un recálculo', async () => {
    const vehiculoEjemplo = makeEntity(EntityType.VEHICLE, 'toyota-corolla')
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'toyota-corolla', 'ubicado_en'),
    ])
    setupDataset([vehiculoEjemplo, noticiaEjemplo])

    await getBidirectionalRelations(noticiaEjemplo)
    const callsAfterFirst = mockedGetEntitiesByType.mock.calls.length

    clearRelationCache()
    await getBidirectionalRelations(noticiaEjemplo)
    expect(mockedGetEntitiesByType.mock.calls.length).toBeGreaterThan(callsAfterFirst)
  })
})

describe('getBidirectionalRelationCount', () => {
  it('cuenta relaciones directas + inferidas sin resolver entidades completas', async () => {
    const guiaEjemplo = makeEntity(EntityType.VEHICLE, 'guia-ejemplo')
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'guia-ejemplo', 'ubicado_en'),
    ])
    setupDataset([guiaEjemplo, noticiaEjemplo])

    const count = await getBidirectionalRelationCount(guiaEjemplo)
    expect(count).toBe(1)
  })

  it('devuelve 0 cuando no hay relaciones', async () => {
    const solo = makeEntity(EntityType.GUIDE, 'guia-suelta')
    setupDataset([solo])

    expect(await getBidirectionalRelationCount(solo)).toBe(0)
  })
})

describe('getBidirectionalRelatedEntitiesWithLabel', () => {
  it('resuelve entidades relacionadas (directas e inferidas) con su label', async () => {
    const guiaEjemplo = makeEntity(EntityType.VEHICLE, 'guia-ejemplo')
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'guia-ejemplo', 'ubicado_en'),
    ])
    setupDataset([guiaEjemplo, noticiaEjemplo])

    const result = await getBidirectionalRelatedEntitiesWithLabel(guiaEjemplo)
    expect(result).toHaveLength(1)
    expect(result[0].entity.slug).toBe('noticia-ejemplo')
    expect(result[0].relation).toBe('ubicado_en')
  })

  it('omite relaciones cuyo target no existe (entidad borrada/rota)', async () => {
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'vehiculo-inexistente', 'ubicado_en'),
    ])
    setupDataset([noticiaEjemplo])

    const result = await getBidirectionalRelatedEntitiesWithLabel(noticiaEjemplo)
    expect(result).toEqual([])
  })

  it('respeta el límite pasado como parámetro', async () => {
    const vehiculoEjemplo = makeEntity(EntityType.VEHICLE, 'toyota-corolla')
    const guiaEjemplo = makeEntity(EntityType.VEHICLE, 'guia-ejemplo')
    const noticiaEjemplo = makeEntity(EntityType.NEWS, 'noticia-ejemplo', [
      rel(EntityType.VEHICLE, 'toyota-corolla', 'ubicado_en'),
      rel(EntityType.VEHICLE, 'guia-ejemplo', 'aparece_en'),
    ])
    setupDataset([vehiculoEjemplo, guiaEjemplo, noticiaEjemplo])

    const result = await getBidirectionalRelatedEntitiesWithLabel(noticiaEjemplo, 1)
    expect(result).toHaveLength(1)
  })
})

describe('detectCircularRelations', () => {
  it('detecta una auto-referencia directa (A -> A)', async () => {
    const a = makeEntity(EntityType.NEWS, 'a', [
      rel(EntityType.NEWS, 'a', 'amigo_de'),
    ])
    setupDataset([a])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([rel(EntityType.NEWS, 'a', 'amigo_de')])
  })

  it('detecta un ciclo corto A -> B -> A', async () => {
    const a = makeEntity(EntityType.NEWS, 'a', [
      rel(EntityType.NEWS, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.NEWS, 'b', [
      rel(EntityType.NEWS, 'a', 'amigo_de'),
    ])
    setupDataset([a, b])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([rel(EntityType.NEWS, 'b', 'amigo_de')])
  })

  it('detecta un ciclo más largo A -> B -> C -> A dentro de maxDepth', async () => {
    const a = makeEntity(EntityType.NEWS, 'a', [
      rel(EntityType.NEWS, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.NEWS, 'b', [
      rel(EntityType.NEWS, 'c', 'amigo_de'),
    ])
    const c = makeEntity(EntityType.NEWS, 'c', [
      rel(EntityType.NEWS, 'a', 'amigo_de'),
    ])
    setupDataset([a, b, c])

    const circular = await detectCircularRelations(a, 5)
    expect(circular).toEqual([rel(EntityType.NEWS, 'b', 'amigo_de')])
  })

  it('no reporta ciclo si el camino de vuelta excede maxDepth', async () => {
    const a = makeEntity(EntityType.NEWS, 'a', [
      rel(EntityType.NEWS, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.NEWS, 'b', [
      rel(EntityType.NEWS, 'c', 'amigo_de'),
    ])
    const c = makeEntity(EntityType.NEWS, 'c', [
      rel(EntityType.NEWS, 'a', 'amigo_de'),
    ])
    setupDataset([a, b, c])

    // El ciclo A->B->C->A requiere 2 saltos adicionales desde B; con
    // maxDepth=1 no debería alcanzar a encontrar el camino de vuelta.
    const circular = await detectCircularRelations(a, 1)
    expect(circular).toEqual([])
  })

  it('no reporta ciclo cuando las relaciones forman un camino sin retorno (DAG)', async () => {
    const a = makeEntity(EntityType.NEWS, 'a', [
      rel(EntityType.NEWS, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.NEWS, 'b', [
      rel(EntityType.NEWS, 'c', 'amigo_de'),
    ])
    const c = makeEntity(EntityType.NEWS, 'c')
    setupDataset([a, b, c])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([])
  })

  it('devuelve array vacío cuando la entidad no tiene relations', async () => {
    const solo = makeEntity(EntityType.GUIDE, 'guia-suelta')
    setupDataset([solo])

    expect(await detectCircularRelations(solo)).toEqual([])
  })

  it('no entra en loop infinito con un ciclo que no incluye al nodo de partida', async () => {
    // a -> b -> c -> b (ciclo entre b y c, sin volver nunca a "a").
    // El DFS debe cortar por `visited` y terminar sin colgarse.
    const a = makeEntity(EntityType.NEWS, 'a', [
      rel(EntityType.NEWS, 'b', 'amigo_de'),
    ])
    const b = makeEntity(EntityType.NEWS, 'b', [
      rel(EntityType.NEWS, 'c', 'amigo_de'),
    ])
    const c = makeEntity(EntityType.NEWS, 'c', [
      rel(EntityType.NEWS, 'b', 'amigo_de'),
    ])
    setupDataset([a, b, c])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([])
  })

  it('evalúa cada relación directa de forma independiente (una en ciclo, otra no)', async () => {
    const a = makeEntity(EntityType.NEWS, 'a', [
      rel(EntityType.NEWS, 'a', 'amigo_de'), // auto-referencia: ciclo
      rel(EntityType.NEWS, 'd', 'amigo_de'), // sin retorno: no es ciclo
    ])
    const d = makeEntity(EntityType.NEWS, 'd')
    setupDataset([a, d])

    const circular = await detectCircularRelations(a)
    expect(circular).toEqual([rel(EntityType.NEWS, 'a', 'amigo_de')])
  })
})
