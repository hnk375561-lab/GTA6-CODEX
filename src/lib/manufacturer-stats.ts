import type { Vehicle } from '@/types'
import { slugifyManufacturer } from '@/lib/vehicle-manufacturers'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parseYear } from '@/lib/vehicle-year'
import { getVehicleCategory, type VehicleCategory } from '@/lib/vehicle-category'

/**
 * FASE 7, punto 2 — Agregados derivados para la ficha de fabricante.
 * ============================================================
 * Todo lo que devuelve esta función sale de `Vehicle[]`, ya cargado del
 * catálogo — nunca se inventa ni se completa un dato faltante. Reutiliza
 * tal cual los tres helpers que ya existían en el repo antes de FASE 7
 * (auditoría explícita: no reescribir una versión propia acá):
 *   - `slugifyManufacturer` (vehicle-manufacturers.ts) para encontrar los
 *     modelos del fabricante — mismo algoritmo que ya usa Manufacturer
 *     como entidad de primera clase (confirmado 1:1 sin huérfanos, ver
 *     docs/p4-manufacturer-entity-implementation.md).
 *   - `parsePowerHp` (vehicle-power.ts) para el rango de potencia — ya
 *     usado para ordenar `/categorias/[grupo]`.
 *   - `parseYear` (vehicle-year.ts) para el rango de años, sobre
 *     `anoLanzamiento` — se prefiere explícitamente sobre `anoProduccion`
 *     porque este último es texto libre con rangos abiertos y
 *     aclaraciones entre paréntesis ("2016-presente (discontinuado en
 *     2025)"), mientras que `anoLanzamiento` ya es un valor numérico
 *     limpio en 249/250 fichas (99.6%) y ya tiene un parser dedicado y
 *     probado (`parseYear`) reutilizado en el resto del sitio.
 */

export interface ManufacturerCategoryCount {
  category: VehicleCategory
  count: number
}

export interface ManufacturerRange {
  min: number
  max: number
}

export interface ManufacturerStats {
  /** Total de modelos del fabricante en el catálogo. */
  totalModels: number
  /** Rango de potencia (hp) entre los modelos con `power` parseable.
   *  `null` si ningún modelo tiene un valor parseable (nunca se muestra
   *  0 ni se inventa un rango). */
  powerRange: ManufacturerRange | null
  /** Rango de años de lanzamiento entre los modelos con `anoLanzamiento`
   *  válido. `null` si ninguno tiene un valor parseable. */
  yearRange: ManufacturerRange | null
  /** Categorías amplias (SUV, Sedán...) presentes entre los modelos del
   *  fabricante, con conteo, ordenadas por frecuencia descendente —
   *  misma agregación que `computeCategoryOptions` pero acotada a este
   *  fabricante. Vehículos sin `class` documentada o categoría 'Otros'
   *  quedan afuera del listado (no aportan navegación real hacia
   *  `/categorias/[grupo]`). */
  categories: ManufacturerCategoryCount[]
  /** Subconjunto de modelos del fabricante marcados `featured: true` en
   *  el contenido — filtro directo, no un cálculo nuevo. */
  featuredModels: Vehicle[]
}

/**
 * Calcula los agregados de un fabricante a partir del catálogo completo
 * de vehículos. `manufacturerSlug` es el slug de la entidad Manufacturer
 * (`entity.slug` en la ficha) — coincide 1:1 con
 * `slugifyManufacturer(vehicle.manufacturer)` para los 250 vehículos
 * actuales (ver auditoría FASE 7, punto 1), así que no hace falta
 * resolverlo contra el nombre del fabricante por separado.
 */
export function getManufacturerStats(manufacturerSlug: string, vehicles: Vehicle[]): ManufacturerStats {
  const models = vehicles.filter(
    (v) => v.manufacturer && slugifyManufacturer(v.manufacturer) === manufacturerSlug
  )

  const powers = models.map(parsePowerHp).filter((v): v is number => v !== null)
  const powerRange = powers.length > 0 ? { min: Math.min(...powers), max: Math.max(...powers) } : null

  const years = models.map(parseYear).filter((v): v is number => v !== null)
  const yearRange = years.length > 0 ? { min: Math.min(...years), max: Math.max(...years) } : null

  const categoryFreq = new Map<VehicleCategory, number>()
  for (const model of models) {
    const category = getVehicleCategory(model.class)
    if (!category || category === 'Otros') continue
    categoryFreq.set(category, (categoryFreq.get(category) ?? 0) + 1)
  }
  const categories = Array.from(categoryFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }))

  const featuredModels = models.filter((m) => m.featured)

  return {
    totalModels: models.length,
    powerRange,
    yearRange,
    categories,
    featuredModels,
  }
}
