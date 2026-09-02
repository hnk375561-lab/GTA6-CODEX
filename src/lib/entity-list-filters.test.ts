import { describe, expect, it } from 'vitest'
import { EntityType, type Entity, type Vehicle } from '@/types'
import {
  MIN_ATTRIBUTE_COUNT,
  MAX_TAG_OPTIONS,
  buildFuse,
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

  it('agrega "power" solo si es lista de vehículos con al menos 2 valores de power parseables', () => {
    const withPower = [
      makeVehicle({ slug: 'a', title: 'A', power: '300 hp' }),
      makeVehicle({ slug: 'b', title: 'B', power: '450 hp' }),
    ]
    expect(computeSortOptions(withPower, undefined, true)).toContain('power')
    expect(computeSortOptions(withPower, undefined, false)).not.toContain('power')

    const onlyOne = [makeVehicle({ slug: 'a', title: 'A', power: '300 hp' }), makeVehicle({ slug: 'b', title: 'B' })]
    expect(computeSortOptions(onlyOne, undefined, true)).not.toContain('power')
  })

  it('agrega "price" solo si es lista de vehículos con al menos 2 valores de precio USD parseables (priceStructured)', () => {
    const withPrice = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'single', currency: 'USD', amount: 50000, raw: 'USD 50.000' } }),
    ]
    expect(computeSortOptions(withPrice, undefined, true)).toContain('price')
    expect(computeSortOptions(withPrice, undefined, false)).not.toContain('price')

    const onlyOne = [
      makeVehicle({ slug: 'a', title: 'A', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      makeVehicle({ slug: 'b', title: 'B', priceStructured: { type: 'unstructured', currency: null, raw: 'Consultar red de concesionarios' } }),
    ]
    expect(computeSortOptions(onlyOne, undefined, true)).not.toContain('price')
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

  it('ordena por potencia (power), sin dato al final', () => {
    const withPower: Entity[] = [
      makeVehicle({ slug: 'weak', title: 'W', power: '150 hp' }),
      makeVehicle({ slug: 'nodata', title: 'N' }),
      makeVehicle({ slug: 'strong', title: 'S', power: '600 hp' }),
    ]
    const result = filterAndSortEntities({
      entities: withPower,
      query: '',
      status: 'todos',
      selectedClass: null,
      selectedTags: [],
      sortBy: 'power',
    })
    expect(result.map((e) => e.slug)).toEqual(['strong', 'weak', 'nodata'])
  })

  it('ordena por menor precio (price), sin dato al final', () => {
    const withPrice: Entity[] = [
      makeVehicle({ slug: 'expensive', title: 'E', priceStructured: { type: 'single', currency: 'USD', amount: 90000, raw: 'USD 90.000' } }),
      makeVehicle({ slug: 'nodata', title: 'N', priceStructured: { type: 'unstructured', currency: null, raw: 'Consultar red de concesionarios' } }),
      makeVehicle({ slug: 'cheap', title: 'C', priceStructured: { type: 'single', currency: 'USD', amount: 25000, raw: 'USD 25.000' } }),
    ]
    const result = filterAndSortEntities({
      entities: withPrice,
      query: '',
      status: 'todos',
      selectedClass: null,
      selectedTags: [],
      sortBy: 'price',
    })
    expect(result.map((e) => e.slug)).toEqual(['cheap', 'expensive', 'nodata'])
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

  describe('filtro de potencia (powerRange)', () => {
    const withPower: Vehicle[] = [
      makeVehicle({ slug: 'low', title: 'Low Power', power: '90 hp' }),
      makeVehicle({ slug: 'mid', title: 'Mid Power', power: '250 hp' }),
      makeVehicle({ slug: 'high', title: 'High Power', power: '500 hp' }),
      // Sin `power` — debe quedar afuera de cualquier filtro activo, nunca
      // asumirse "adentro" de un rango que no se puede confirmar.
      makeVehicle({ slug: 'unknown', title: 'Unknown Power' }),
    ]

    it('sin powerRange (null), no filtra por potencia', () => {
      const result = filterAndSortEntities({
        entities: withPower,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        powerRange: null,
      })
      expect(result.map((e) => e.slug)).toEqual(['low', 'mid', 'high', 'unknown'])
    })

    it('filtra dejando solo los vehículos dentro del rango [min, max]', () => {
      const result = filterAndSortEntities({
        entities: withPower,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        powerRange: [100, 300],
      })
      expect(result.map((e) => e.slug)).toEqual(['mid'])
    })

    it('excluye vehículos sin power parseable cuando el filtro está activo', () => {
      const result = filterAndSortEntities({
        entities: withPower,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        powerRange: [0, 1000],
      })
      expect(result.map((e) => e.slug)).toEqual(['low', 'mid', 'high'])
    })

    it('combina con otros filtros (estado + potencia)', () => {
      const mixedStatus: Vehicle[] = [
        makeVehicle({ slug: 'a', title: 'A', power: '200 hp', status: 'confirmado' }),
        makeVehicle({ slug: 'b', title: 'B', power: '210 hp', status: 'rumor' }),
      ]
      const result = filterAndSortEntities({
        entities: mixedStatus,
        query: '',
        status: 'confirmado',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        powerRange: [0, 1000],
      })
      expect(result.map((e) => e.slug)).toEqual(['a'])
    })
  })

  describe('filtro de precio (priceRange)', () => {
    const withPrice: Vehicle[] = [
      makeVehicle({ slug: 'cheap', title: 'Cheap', priceStructured: { type: 'single', currency: 'USD', amount: 20000, raw: 'USD 20.000' } }),
      makeVehicle({ slug: 'mid', title: 'Mid', priceStructured: { type: 'single', currency: 'USD', amount: 40000, raw: 'USD 40.000' } }),
      makeVehicle({ slug: 'expensive', title: 'Expensive', priceStructured: { type: 'single', currency: 'USD', amount: 90000, raw: 'USD 90.000' } }),
      // Sin priceStructured en USD — debe quedar afuera de cualquier
      // rango numérico activo, nunca tratarse como precio 0.
      makeVehicle({ slug: 'unknown', title: 'Unknown Price' }),
      // Otra moneda: tampoco participa (PASO 2 — no se mezclan monedas).
      makeVehicle({ slug: 'ars', title: 'Precio en ARS', priceStructured: { type: 'single', currency: 'ARS', amount: 4539990, raw: 'ARS 4.539.990' } }),
    ]

    it('sin priceRange (null), no filtra por precio', () => {
      const result = filterAndSortEntities({
        entities: withPrice,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        priceRange: null,
      })
      expect(result.map((e) => e.slug)).toEqual(['cheap', 'mid', 'expensive', 'unknown', 'ars'])
    })

    it('respeta el precio mínimo del rango', () => {
      const result = filterAndSortEntities({
        entities: withPrice,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        priceRange: [40000, 90000],
      })
      expect(result.map((e) => e.slug)).toEqual(['mid', 'expensive'])
    })

    it('respeta el precio máximo del rango', () => {
      const result = filterAndSortEntities({
        entities: withPrice,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        priceRange: [20000, 40000],
      })
      expect(result.map((e) => e.slug)).toEqual(['cheap', 'mid'])
    })

    it('incluye un vehículo exactamente en el límite del rango', () => {
      const result = filterAndSortEntities({
        entities: withPrice,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        priceRange: [20000, 20000],
      })
      expect(result.map((e) => e.slug)).toEqual(['cheap'])
    })

    it('excluye un vehículo justo fuera del límite del rango', () => {
      const result = filterAndSortEntities({
        entities: withPrice,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        priceRange: [20001, 90000],
      })
      expect(result.map((e) => e.slug)).toEqual(['mid', 'expensive'])
    })

    it('excluye vehículos sin precio USD parseable (desconocido u otra moneda) cuando el filtro está activo', () => {
      const result = filterAndSortEntities({
        entities: withPrice,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        priceRange: [0, 1000000],
      })
      expect(result.map((e) => e.slug)).toEqual(['cheap', 'mid', 'expensive'])
    })

    it('combina precio + potencia', () => {
      const combo: Vehicle[] = [
        makeVehicle({ slug: 'a', title: 'A', power: '200 hp', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
        makeVehicle({ slug: 'b', title: 'B', power: '500 hp', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      ]
      const result = filterAndSortEntities({
        entities: combo,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        powerRange: [0, 300],
        priceRange: [0, 1000000],
      })
      expect(result.map((e) => e.slug)).toEqual(['a'])
    })

    it('combina precio + clase', () => {
      const combo: Vehicle[] = [
        makeVehicle({ slug: 'a', title: 'A', class: 'sedan', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
        makeVehicle({ slug: 'b', title: 'B', class: 'suv', priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      ]
      const result = filterAndSortEntities({
        entities: combo,
        query: '',
        status: 'todos',
        selectedClass: 'suv',
        selectedTags: [],
        sortBy: 'default',
        priceRange: [0, 1000000],
      })
      expect(result.map((e) => e.slug)).toEqual(['b'])
    })
  })

  describe('filtro de año (yearRange)', () => {
    const withYear: Vehicle[] = [
      makeVehicle({ slug: 'old', title: 'Old', anoLanzamiento: 1962 }),
      makeVehicle({ slug: 'mid', title: 'Mid', anoLanzamiento: 2018 }),
      makeVehicle({ slug: 'new', title: 'New', anoLanzamiento: 2024 }),
      // Sin año — debe quedar afuera de cualquier rango activo, nunca
      // inventarse un año.
      makeVehicle({ slug: 'unknown', title: 'Unknown Year' }),
      // Año inválido (no numérico) — mismo criterio que "unknown".
      makeVehicle({ slug: 'invalid', title: 'Invalid Year', anoLanzamiento: 'sin confirmar' }),
    ]

    it('sin yearRange (null), no filtra por año', () => {
      const result = filterAndSortEntities({
        entities: withYear,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        yearRange: null,
      })
      expect(result.map((e) => e.slug)).toEqual(['old', 'mid', 'new', 'unknown', 'invalid'])
    })

    it('respeta el año mínimo del rango', () => {
      const result = filterAndSortEntities({
        entities: withYear,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        yearRange: [2018, 2024],
      })
      expect(result.map((e) => e.slug)).toEqual(['mid', 'new'])
    })

    it('respeta el año máximo del rango', () => {
      const result = filterAndSortEntities({
        entities: withYear,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        yearRange: [1962, 2018],
      })
      expect(result.map((e) => e.slug)).toEqual(['old', 'mid'])
    })

    it('incluye un vehículo exactamente en el límite del rango', () => {
      const result = filterAndSortEntities({
        entities: withYear,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        yearRange: [2024, 2024],
      })
      expect(result.map((e) => e.slug)).toEqual(['new'])
    })

    it('excluye vehículos sin año válido (ausente o inválido) cuando el filtro está activo', () => {
      const result = filterAndSortEntities({
        entities: withYear,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        yearRange: [1900, 2100],
      })
      expect(result.map((e) => e.slug)).toEqual(['old', 'mid', 'new'])
    })

    it('combina año + precio', () => {
      const combo: Vehicle[] = [
        makeVehicle({ slug: 'a', title: 'A', anoLanzamiento: 2020, priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
        makeVehicle({ slug: 'b', title: 'B', anoLanzamiento: 2010, priceStructured: { type: 'single', currency: 'USD', amount: 30000, raw: 'USD 30.000' } }),
      ]
      const result = filterAndSortEntities({
        entities: combo,
        query: '',
        status: 'todos',
        selectedClass: null,
        selectedTags: [],
        sortBy: 'default',
        yearRange: [2015, 2024],
        priceRange: [0, 1000000],
      })
      expect(result.map((e) => e.slug)).toEqual(['a'])
    })

    it('combina año + clase', () => {
      const combo: Vehicle[] = [
        makeVehicle({ slug: 'a', title: 'A', class: 'sedan', anoLanzamiento: 2020 }),
        makeVehicle({ slug: 'b', title: 'B', class: 'suv', anoLanzamiento: 2020 }),
      ]
      const result = filterAndSortEntities({
        entities: combo,
        query: '',
        status: 'todos',
        selectedClass: 'suv',
        selectedTags: [],
        sortBy: 'default',
        yearRange: [2015, 2024],
      })
      expect(result.map((e) => e.slug)).toEqual(['b'])
    })

    it('combina precio + año + búsqueda', () => {
      const combo: Vehicle[] = [
        makeVehicle({ slug: 'toyota-corolla', title: 'Toyota Corolla', anoLanzamiento: 2020, priceStructured: { type: 'single', currency: 'USD', amount: 25000, raw: 'USD 25.000' } }),
        makeVehicle({ slug: 'toyota-hilux', title: 'Toyota Hilux', anoLanzamiento: 2010, priceStructured: { type: 'single', currency: 'USD', amount: 25000, raw: 'USD 25.000' } }),
        makeVehicle({ slug: 'honda-civic', title: 'Honda Civic', anoLanzamiento: 2020, priceStructured: { type: 'single', currency: 'USD', amount: 25000, raw: 'USD 25.000' } }),
      ]
      const fuse = buildFuse(combo)
      const result = filterAndSortEntities(
        {
          entities: combo,
          query: 'Toyota',
          status: 'todos',
          selectedClass: null,
          selectedTags: [],
          sortBy: 'default',
          yearRange: [2015, 2024],
          priceRange: [0, 1000000],
        },
        fuse
      )
      expect(result.map((e) => e.slug)).toEqual(['toyota-corolla'])
    })

    it('combina todos los filtros simultáneamente (búsqueda + clase + tags + estado + potencia + precio + año)', () => {
      const combo: Vehicle[] = [
        makeVehicle({
          slug: 'match',
          title: 'Toyota Corolla',
          status: 'confirmado',
          class: 'sedan',
          tags: ['hibrido'],
          power: '150 hp',
          anoLanzamiento: 2022,
          priceStructured: { type: 'single', currency: 'USD', amount: 28000, raw: 'USD 28.000' },
        }),
        makeVehicle({
          slug: 'wrong-status',
          title: 'Toyota Camry',
          status: 'rumor',
          class: 'sedan',
          tags: ['hibrido'],
          power: '150 hp',
          anoLanzamiento: 2022,
          priceStructured: { type: 'single', currency: 'USD', amount: 28000, raw: 'USD 28.000' },
        }),
        makeVehicle({
          slug: 'wrong-year',
          title: 'Toyota Avalon',
          status: 'confirmado',
          class: 'sedan',
          tags: ['hibrido'],
          power: '150 hp',
          anoLanzamiento: 2005,
          priceStructured: { type: 'single', currency: 'USD', amount: 28000, raw: 'USD 28.000' },
        }),
      ]
      const fuse = buildFuse(combo)
      const result = filterAndSortEntities(
        {
          entities: combo,
          query: 'Toyota',
          status: 'confirmado',
          selectedClass: 'sedan',
          selectedTags: ['hibrido'],
          sortBy: 'default',
          powerRange: [100, 200],
          priceRange: [0, 50000],
          yearRange: [2015, 2024],
        },
        fuse
      )
      expect(result.map((e) => e.slug)).toEqual(['match'])
    })
  })
})
