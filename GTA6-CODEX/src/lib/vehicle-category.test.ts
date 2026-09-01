import { describe, expect, it } from 'vitest'
import { EntityType, type Vehicle } from '@/types'
import {
  computeCategoryOptions,
  computeSeoCategoryOptions,
  categoryPageHref,
  getVehicleCategory,
  categoryToSlug,
  categoryFromSlug,
  VEHICLE_CATEGORIES,
  SEO_CATEGORIES,
  MIN_VEHICLES_PER_SEO_CATEGORY,
} from '@/lib/vehicle-category'

function makeVehicle(overrides: Partial<Vehicle> & Pick<Vehicle, 'slug' | 'title'>): Vehicle {
  return {
    type: EntityType.VEHICLE,
    description: 'Descripción de prueba',
    status: 'confirmado',
    tags: [],
    featured: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  } as Vehicle
}

describe('getVehicleCategory', () => {
  it('devuelve null si no hay class documentada', () => {
    expect(getVehicleCategory(undefined)).toBeNull()
    expect(getVehicleCategory(null)).toBeNull()
    expect(getVehicleCategory('')).toBeNull()
  })

  // Auditoría FASE 5: las 77 clases reales de src/content/vehiculos/*.json
  // deben mapear exactamente a la categoría documentada en
  // docs/fase-5-taxonomia-categorias.md — cualquier drift acá es una
  // regresión de taxonomía, no un cambio de comportamiento aceptable.
  const CASES: Array<[string, string]> = [
    ['4x4 compacto', 'SUV'],
    ['City car', 'Hatchback'],
    ['Crossover fastback', 'SUV'],
    ['Deportivo', 'Deportivo'],
    ['Deportivo eléctrico', 'Deportivo'],
    ['Deportivo híbrido', 'Deportivo'],
    ['Furgon compacto', 'Utilitario'],
    ['Furgón', 'Utilitario'],
    ['Gran turismo', 'Deportivo'],
    ['Gran turismo de lujo', 'Deportivo'],
    ['Hatchback', 'Hatchback'],
    ['Hatchback compacto', 'Hatchback'],
    ['Hatchback deportivo', 'Hatchback'],
    ['Hatchback económico', 'Hatchback'],
    ['Hatchback eléctrico', 'Hatchback'],
    ['Hatchback premium', 'Hatchback'],
    ['Hatchback urbano', 'Hatchback'],
    ['Hatchback/SUV', 'SUV'],
    ['Hatchback/SUV coupé', 'SUV'],
    ['Hatchback/Sedán', 'Hatchback'],
    ['Microcar eléctrico', 'Otros'],
    ['Minivan', 'Monovolumen'],
    ['Minivan compacta', 'Monovolumen'],
    ['Minivan de lujo', 'Monovolumen'],
    ['Moto', 'Moto'],
    ['Moto adventure', 'Moto'],
    ['Moto aventura', 'Moto'],
    ['Moto chopper', 'Moto'],
    ['Moto clásica', 'Moto'],
    ['Moto deportiva', 'Moto'],
    ['Moto dual-sport 250cc', 'Moto'],
    ['Moto enduro', 'Moto'],
    ['Moto naked', 'Moto'],
    ['Moto naked 200cc', 'Moto'],
    ['Moto naked deportiva', 'Moto'],
    ['Moto superdeportiva', 'Moto'],
    ['Moto touring', 'Moto'],
    ['Moto trail', 'Moto'],
    ['Moto trail 150cc', 'Moto'],
    ['Moto utilitaria', 'Moto'],
    ['Pickup', 'Pickup'],
    ['Pickup compacta', 'Pickup'],
    ['Pickup eléctrica', 'Pickup'],
    ['Pickup grande', 'Pickup'],
    ['Pickup mediana', 'Pickup'],
    ['SUV', 'SUV'],
    ['SUV 4x4', 'SUV'],
    ['SUV 4x4 grande', 'SUV'],
    ['SUV 4x4 premium', 'SUV'],
    ['SUV compacto', 'SUV'],
    ['SUV compacto premium', 'SUV'],
    ['SUV coupé', 'SUV'],
    ['SUV coupé compacta', 'SUV'],
    ['SUV coupé deportiva', 'SUV'],
    ['SUV de lujo', 'SUV'],
    ['SUV de ultralujo', 'SUV'],
    ['SUV deportivo', 'SUV'],
    ['SUV eléctrico', 'SUV'],
    ['SUV grande', 'SUV'],
    ['SUV mediano', 'SUV'],
    ['SUV mediano premium', 'SUV'],
    ['SUV premium', 'SUV'],
    ['SUV premium compacta', 'SUV'],
    ['SUV todoterreno', 'SUV'],
    ['Scooter', 'Moto'],
    ['Sedán', 'Sedán'],
    ['Sedán compacto', 'Sedán'],
    ['Sedán deportivo premium', 'Sedán'],
    ['Sedán económico', 'Sedán'],
    ['Sedán ejecutivo', 'Sedán'],
    ['Sedán eléctrico', 'Sedán'],
    ['Sedán fastback', 'Sedán'],
    ['Sedán híbrido', 'Sedán'],
    ['Sedán mediano', 'Sedán'],
    ['Sedán premium', 'Sedán'],
    ['Sedán/Wagon grande', 'Familiar'],
    ['Utilitario', 'Utilitario'],
  ]

  it.each(CASES)('mapea %s -> %s', (vehicleClass, expected) => {
    expect(getVehicleCategory(vehicleClass)).toBe(expected)
  })

  it('tiene exactamente 12 categorías definidas', () => {
    expect(VEHICLE_CATEGORIES).toHaveLength(12)
    expect(VEHICLE_CATEGORIES).toEqual([
      'SUV', 'Sedán', 'Hatchback', 'Pickup', 'Deportivo', 'Familiar',
      'Coupé', 'Cabrio', 'Monovolumen', 'Utilitario', 'Moto', 'Otros',
    ])
  })

  it('usa fallback por keyword para clases no auditadas todavía', () => {
    expect(getVehicleCategory('Cabriolet deportivo')).toBe('Cabrio')
    expect(getVehicleCategory('Station wagon familiar')).toBe('Familiar')
    expect(getVehicleCategory('Coupé deportivo 2 puertas')).toBe('Coupé')
    expect(getVehicleCategory('Clase totalmente desconocida xyz')).toBe('Otros')
  })
})

describe('categoryToSlug / categoryFromSlug', () => {
  it('genera slugs sin acentos ni mayúsculas', () => {
    expect(categoryToSlug('SUV')).toBe('suv')
    expect(categoryToSlug('Sedán')).toBe('sedan')
    expect(categoryToSlug('Coupé')).toBe('coupe')
  })

  it('categoryFromSlug es la inversa para categorías SEO válidas', () => {
    expect(categoryFromSlug('suv')).toBe('SUV')
    expect(categoryFromSlug('sedan')).toBe('Sedán')
    expect(categoryFromSlug('pickup')).toBe('Pickup')
  })

  it('devuelve null para slugs inválidos o para "otros" (excluido de SEO)', () => {
    expect(categoryFromSlug('no-existe')).toBeNull()
    expect(categoryFromSlug('otros')).toBeNull()
  })

  it('SEO_CATEGORIES excluye Otros y conserva las otras 11', () => {
    expect(SEO_CATEGORIES).not.toContain('Otros')
    expect(SEO_CATEGORIES).toHaveLength(11)
  })
})

describe('computeCategoryOptions', () => {
  it('agrupa y cuenta por categoría, ordenado por frecuencia descendente', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', class: 'SUV compacto' }),
      makeVehicle({ slug: 'b', title: 'B', class: 'SUV grande' }),
      makeVehicle({ slug: 'c', title: 'C', class: 'Hatchback' }),
      makeVehicle({ slug: 'd', title: 'D', class: 'Hatchback económico' }),
      makeVehicle({ slug: 'e', title: 'E', class: 'Moto naked' }),
    ]
    expect(computeCategoryOptions(vehicles)).toEqual([
      { group: 'SUV', count: 2 },
      { group: 'Hatchback', count: 2 },
    ])
  })

  it('respeta el mínimo de apariciones (default 2)', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', class: 'SUV compacto' }),
      makeVehicle({ slug: 'b', title: 'B', class: 'Sedán' }),
    ]
    expect(computeCategoryOptions(vehicles)).toEqual([])
  })

  it('ignora vehículos sin class documentada', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', class: 'SUV compacto' }),
      makeVehicle({ slug: 'b', title: 'B', class: 'SUV grande' }),
      makeVehicle({ slug: 'c', title: 'C' }),
    ]
    expect(computeCategoryOptions(vehicles)).toEqual([{ group: 'SUV', count: 2 }])
  })
})

describe('computeSeoCategoryOptions', () => {
  // FASE 6, Gap 1/4: única fuente de verdad para qué categorías tienen
  // página SEO real — usada por el hub `/categorias`, por
  // `generateStaticParams` de `/categorias/[grupo]` y por `sitemap.ts`.
  // Estos tests cubren exactamente lo que el hub necesita: listar solo
  // categorías que superan el umbral, nunca 'Otros', en el orden
  // esperado (frecuencia descendente, igual que computeCategoryOptions).

  it('excluye categorías bajo MIN_VEHICLES_PER_SEO_CATEGORY', () => {
    const vehicles = [
      makeVehicle({ slug: 'a', title: 'A', class: 'SUV compacto' }),
      makeVehicle({ slug: 'b', title: 'B', class: 'SUV grande' }),
      makeVehicle({ slug: 'c', title: 'C', class: 'Sedán' }),
    ]
    expect(computeSeoCategoryOptions(vehicles)).toEqual([])
  })

  it('incluye una categoría apenas cruza el umbral', () => {
    const vehicles = Array.from({ length: MIN_VEHICLES_PER_SEO_CATEGORY }, (_, i) =>
      makeVehicle({ slug: `suv-${i}`, title: `SUV ${i}`, class: 'SUV compacto' })
    )
    expect(computeSeoCategoryOptions(vehicles)).toEqual([
      { group: 'SUV', count: MIN_VEHICLES_PER_SEO_CATEGORY },
    ])
  })

  it('excluye "Otros" aunque numéricamente cruce el umbral', () => {
    const vehicles = Array.from({ length: MIN_VEHICLES_PER_SEO_CATEGORY + 2 }, (_, i) =>
      makeVehicle({ slug: `otro-${i}`, title: `Otro ${i}`, class: 'Microcar eléctrico' })
    )
    expect(computeSeoCategoryOptions(vehicles)).toEqual([])
  })

  it('ordena por frecuencia descendente, igual que computeCategoryOptions', () => {
    const suvs = Array.from({ length: MIN_VEHICLES_PER_SEO_CATEGORY + 5 }, (_, i) =>
      makeVehicle({ slug: `suv-${i}`, title: `SUV ${i}`, class: 'SUV compacto' })
    )
    const sedans = Array.from({ length: MIN_VEHICLES_PER_SEO_CATEGORY }, (_, i) =>
      makeVehicle({ slug: `sedan-${i}`, title: `Sedán ${i}`, class: 'Sedán' })
    )
    expect(computeSeoCategoryOptions([...sedans, ...suvs])).toEqual([
      { group: 'SUV', count: MIN_VEHICLES_PER_SEO_CATEGORY + 5 },
      { group: 'Sedán', count: MIN_VEHICLES_PER_SEO_CATEGORY },
    ])
  })
})

describe('categoryPageHref', () => {
  // FASE 6, Gap 2/4: el link/badge de categoría en la ficha de vehículo
  // solo debe aparecer cuando hay una página real a la que apuntar.

  it('devuelve la URL de categoría para una class documentada', () => {
    expect(categoryPageHref('SUV compacto')).toBe('/categorias/suv')
    expect(categoryPageHref('Sedán ejecutivo')).toBe('/categorias/sedan')
  })

  it('devuelve null si no hay class documentada', () => {
    expect(categoryPageHref(undefined)).toBeNull()
    expect(categoryPageHref(null)).toBeNull()
    expect(categoryPageHref('')).toBeNull()
  })

  it('devuelve null para la categoría "Otros" (sin página SEO propia)', () => {
    expect(categoryPageHref('Microcar eléctrico')).toBeNull()
  })
})
