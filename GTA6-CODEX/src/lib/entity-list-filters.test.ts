import { describe, expect, it } from 'vitest'
import { EntityType, type Entity, type Vehicle } from '@/types'
import {
  MIN_ATTRIBUTE_COUNT,
  MAX_TAG_OPTIONS,
  computeClassOptions,
  computeSortOptions,
  computeStatusCounts,
  computeTagOptions,
  filterAndSortEntities,
  getRelationCount,
} from '@/lib/entity-list-filters'

/** Construye un Vehicle mínimo válido con overrides puntuales — evita
 *  repetir los ~15 campos requeridos por el schema en cada test. */
function makeVehicle(overrides: Partial<Vehicle> & Pick<Vehicle, 'slug' | 'title'>): Vehicle {
  return {
    type: EntityType.VEHICLE,
    description: 'Descripción de prueba',
    content: 'Contenido de prueba',
    status: 'confirmado',
    tags: [],
    featured: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    manufacturer: 'Vapid',
    class: 'sedan',
    driven_by: [],
    locations: [],
    customizable: false,
    evidence: { level: 'respaldado' },
    relations: [],
    ...overrides,
  } as Vehicle
}

describe('computeStatusCounts', () => {
  it('cuenta cada estado editorial y el total en "todos"', () => {
    const entities: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', status: 'confirmado' }),
      makeVehicle({ slug: 'b', title: 'B', status: 'rumor' }),
      makeVehicle({ slug: 'c', title: 'C', status: 'rumor' }),
      makeVehicle({ slug: 'd', title: 'D', status: 'nuestro' }),
    ]
    expect(computeStatusCounts(entities)).toEqual({
      todos: 4,
      confirmado: 1,
      rumor: 2,
      nuestro: 1,
    })
  })

  it('devuelve todo en cero para una lista vacía', () => {
    expect(computeStatusCounts([])).toEqual({ todos: 0, confirmado: 0, rumor: 0, nuestro: 0 })
  })
})

describe('getRelationCount', () => {
  it('prioriza el mapa resuelto en servidor sobre entity.relations', () => {
    const entity = makeVehicle({ slug: 'a', title: 'A', relations: [{ targetType: EntityType.NEWS, targetSlug: 'x', relation: 'aparece-en' }] })
    expect(getRelationCount(entity, { a: 7 })).toBe(7)
  })

  it('cae a entity.relations.length si no hay mapa', () => {
    const entity = makeVehicle({
      slug: 'a',
      title: 'A',
      relations: [
        { targetType: EntityType.NEWS, targetSlug: 'x', relation: 'aparece-en' },
        { targetType: EntityType.GUIDE, targetSlug: 'y', relation: 'conducido-por' },
      ],
    })
    expect(getRelationCount(entity)).toBe(2)
  })

  it('devuelve 0 si no hay relaciones ni mapa', () => {
    expect(getRelationCount(makeVehicle({ slug: 'a', title: 'A', relations: [] }))).toBe(0)
  })
})

describe('computeTagOptions', () => {
  it(`solo incluye tags con al menos ${MIN_ATTRIBUTE_COUNT} apariciones`, () => {
    const entities: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', tags: ['deportivo', 'clasico'] }),
      makeVehicle({ slug: 'b', title: 'B', tags: ['deportivo'] }),
      makeVehicle({ slug: 'c', title: 'C', tags: ['unico'] }),
    ]
    const tags = computeTagOptions(entities)
    expect(tags).toEqual([{ tag: 'deportivo', count: 2 }])
    expect(tags.find((t) => t.tag === 'unico')).toBeUndefined()
    expect(tags.find((t) => t.tag === 'clasico')).toBeUndefined()
  })

  it('ordena por frecuencia descendente y luego alfabéticamente', () => {
    const entities: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', tags: ['zeta', 'alfa'] }),
      makeVehicle({ slug: 'b', title: 'B', tags: ['zeta', 'alfa'] }),
      makeVehicle({ slug: 'c', title: 'C', tags: ['alfa'] }),
    ]
    expect(computeTagOptions(entities)).toEqual([
      { tag: 'alfa', count: 3 },
      { tag: 'zeta', count: 2 },
    ])
  })

  it(`nunca devuelve más de ${MAX_TAG_OPTIONS} opciones`, () => {
    const entities: Entity[] = Array.from({ length: 20 }, (_, i) =>
      makeVehicle({ slug: `v${i}`, title: `V${i}`, tags: [`tag-${i}`, 'compartido'] })
    )
    // Cada 'tag-N' aparece 1 vez (no pasa el mínimo); 'compartido' aparece 20 veces.
    expect(computeTagOptions(entities)).toEqual([{ tag: 'compartido', count: 20 }])
  })
})

describe('computeClassOptions', () => {
  it('devuelve vacío para tipos que no son Vehículo', () => {
    const entities: Entity[] = [makeVehicle({ slug: 'a', title: 'A', class: 'sedan' })]
    expect(computeClassOptions(entities, EntityType.NEWS)).toEqual([])
  })

  it('agrupa por clase solo si aparece 2+ veces, para EntityType.VEHICLE', () => {
    const entities: Entity[] = [
      makeVehicle({ slug: 'a', title: 'A', class: 'sedan' }),
      makeVehicle({ slug: 'b', title: 'B', class: 'sedan' }),
      makeVehicle({ slug: 'c', title: 'C', class: 'deportivo' }),
    ]
    expect(computeClassOptions(entities, EntityType.VEHICLE)).toEqual([{ value: 'sedan', count: 2 }])
  })
})

describe('computeSortOptions', () => {
  it('siempre incluye los 4 criterios base', () => {
    expect(computeSortOptions([], undefined, false)).toEqual(['default', 'az', 'za', 'recent'])
  })

  it('agrega "connections" solo si alguna entidad tiene conexiones', () => {
    const withConnections = [makeVehicle({ slug: 'a', title: 'A', relations: [{ targetType: EntityType.NEWS, targetSlug: 'x', relation: 'r' }] })]
    const withoutConnections = [makeVehicle({ slug: 'a', title: 'A', relations: [] })]
    expect(computeSortOptions(withConnections, undefined, false)).toContain('connections')
    expect(computeSortOptions(withoutConnections, undefined, false)).not.toContain('connections')
  })

  it('agrega "performance" solo si es lista de vehículos con datos de rendimiento', () => {
    const withPerf = [makeVehicle({ slug: 'a', title: 'A', performance: { speed: 'Alta' } })]
    expect(computeSortOptions(withPerf, undefined, true)).toContain('performance')
    expect(computeSortOptions(withPerf, undefined, false)).not.toContain('performance')

    const withoutPerf = [makeVehicle({ slug: 'a', title: 'A' })]
    expect(computeSortOptions(withoutPerf, undefined, true)).not.toContain('performance')
  })
})

describe('filterAndSortEntities', () => {
  const entities: Vehicle[] = [
    makeVehicle({ slug: 'buccaneer', title: 'Albany Buccaneer', status: 'confirmado', class: 'clasico', updatedAt: '2026-08-10T00:00:00Z', tags: ['clasico'] }),
    makeVehicle({ slug: 'banshee', title: 'Bravado Banshee', status: 'rumor', class: 'deportivo', updatedAt: '2026-08-15T00:00:00Z', tags: ['deportivo'], performance: { speed: 'Muy alta' } }),
    makeVehicle({ slug: 'bison', title: 'Bravado Bison', status: 'confirmado', class: 'utilidad', updatedAt: '2026-08-05T00:00:00Z', tags: [], performance: { speed: 'Baja' } }),
  ]

  it('sin filtros activos devuelve todo en el orden recibido', () => {
    const result = filterAndSortEntities({
      entities,
      query: '',
      status: 'todos',
      selectedClass: null,
      selectedTags: [],
      sortBy: 'default',
    })
    expect(result.map((e) => e.slug)).toEqual(['buccaneer', 'banshee', 'bison'])
  })

  it('filtra por estado editorial', () => {
    const result = filterAndSortEntities({
      entities,
      query: '',
      status: 'confirmado',
      selectedClass: null,
      selectedTags: [],
      sortBy: 'default',
    })
    expect(result.map((e) => e.slug).sort()).toEqual(['bison', 'buccaneer'])
  })

  it('filtra por clase de vehículo', () => {
    const result = filterAndSortEntities({
      entities,
      query: '',
      status: 'todos',
      selectedClass: 'deportivo',
      selectedTags: [],
      sortBy: 'default',
    })
    expect(result.map((e) => e.slug)).toEqual(['banshee'])
  })

  it('filtra por tags seleccionados (OR entre tags)', () => {
    const result = filterAndSortEntities({
      entities,
      query: '',
      status: 'todos',
      selectedClass: null,
      selectedTags: ['clasico', 'deportivo'],
      sortBy: 'default',
    })
    expect(result.map((e) => e.slug).sort()).toEqual(['banshee', 'buccaneer'])
  })

  it('combina búsqueda + filtro de estado + orden', () => {
    const result = filterAndSortEntities({
      entities,
      query: 'bravado',
      status: 'confirmado',
      selectedClass: null,
      selectedTags: [],
      sortBy: 'az',
    })
    expect(result.map((e) => e.slug)).toEqual(['bison'])
  })

  it('ordena alfabéticamente (az / za)', () => {
    const az = filterAndSortEntities({ entities, query: '', status: 'todos', selectedClass: null, selectedTags: [], sortBy: 'az' })
    expect(az.map((e) => e.title)).toEqual(['Albany Buccaneer', 'Bravado Banshee', 'Bravado Bison'])

    const za = filterAndSortEntities({ entities, query: '', status: 'todos', selectedClass: null, selectedTags: [], sortBy: 'za' })
    expect(za.map((e) => e.title)).toEqual(['Bravado Bison', 'Bravado Banshee', 'Albany Buccaneer'])
  })

  it('ordena por más reciente (recent)', () => {
    const result = filterAndSortEntities({ entities, query: '', status: 'todos', selectedClass: null, selectedTags: [], sortBy: 'recent' })
    expect(result.map((e) => e.slug)).toEqual(['banshee', 'buccaneer', 'bison'])
  })

  it('ordena por más conexiones (connections), usando el mapa resuelto en servidor', () => {
    const result = filterAndSortEntities({
      entities,
      query: '',
      status: 'todos',
      selectedClass: null,
      selectedTags: [],
      sortBy: 'connections',
      relationCountBySlug: { buccaneer: 1, banshee: 5, bison: 3 },
    })
    expect(result.map((e) => e.slug)).toEqual(['banshee', 'bison', 'buccaneer'])
  })

  it('ordena por mejor rendimiento (performance)', () => {
    const result = filterAndSortEntities({ entities, query: '', status: 'todos', selectedClass: null, selectedTags: [], sortBy: 'performance' })
    // banshee (Muy alta = 5) > bison (Baja = 1) > buccaneer (sin performance = 0)
    expect(result.map((e) => e.slug)).toEqual(['banshee', 'bison', 'buccaneer'])
  })

  it('una búsqueda sin resultados devuelve lista vacía, no revienta', () => {
    const result = filterAndSortEntities({
      entities,
      query: 'esto no existe en ningun vehiculo xyz',
      status: 'todos',
      selectedClass: null,
      selectedTags: [],
      sortBy: 'default',
    })
    expect(result).toEqual([])
  })
})
