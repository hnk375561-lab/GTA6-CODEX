import type { Vehicle } from '@/types'
import { getVehicleCategory } from '@/lib/vehicle-category'
import { parsePowerHp } from '@/lib/vehicle-power'

export interface SimilarVehicle {
  vehicle: Vehicle
  /** Distancia absoluta de potencia (hp) contra el vehículo base, o
   *  `null` si alguno de los dos no tiene potencia parseable — en ese
   *  caso el candidato igual se ofrece (misma categoría ya es una señal
   *  real), pero se ordena después de los que sí tienen distancia. */
  powerDiff: number | null
}

/**
 * Vehículos similares a `vehicle`, calculado 100% sobre datos que ya
 * existen (oportunidad #6 del audit, desbloqueada por `category` —
 * ver vehicle-category.ts, FASE 5). Criterio: misma categoría principal
 * (SUV/Sedán/Hatchback/Pickup/Deportivo/Familiar/Coupé/Cabrio/
 * Monovolumen/Utilitario/Moto/Otros), ordenados por
 * cercanía de potencia (hp) al vehículo base. Nunca cruza categorías —
 * un sedán nunca aparece como "similar" de una pickup aunque tengan
 * potencia parecida, cruzar carrocerías no es lo que un usuario espera
 * de "similares".
 *
 * Excluye explícitamente `excludeSlugs` (pensado para no duplicar lo que
 * ya muestra `RelationsPanel` vía `relations[]` — mismo_fabricante /
 * competidor: si un vehículo ya aparece ahí, repetirlo acá no aporta,
 * solo ocupa espacio con la misma entidad dos veces en la misma
 * página).
 */
export function getSimilarVehicles(
  vehicle: Vehicle,
  allVehicles: Vehicle[],
  options: { limit?: number; excludeSlugs?: Set<string> } = {}
): SimilarVehicle[] {
  const { limit = 6, excludeSlugs } = options

  const group = getVehicleCategory(vehicle.class)
  if (!group) return []

  const basePower = parsePowerHp(vehicle)

  const candidates = allVehicles.filter((candidate) => {
    if (candidate.slug === vehicle.slug) return false
    if (excludeSlugs?.has(candidate.slug)) return false
    return getVehicleCategory(candidate.class) === group
  })

  const withDiff: SimilarVehicle[] = candidates.map((candidate) => {
    const candidatePower = parsePowerHp(candidate)
    const powerDiff =
      basePower !== null && candidatePower !== null ? Math.abs(candidatePower - basePower) : null
    return { vehicle: candidate, powerDiff }
  })

  // Los que sí tienen distancia de potencia calculable van primero,
  // ordenados de más cercano a más lejano; los que no tienen potencia
  // parseable (ninguno de los dos lados, o alguno) van al final en el
  // orden en que aparecen — sin inventar una distancia que no existe.
  withDiff.sort((a, b) => {
    if (a.powerDiff === null && b.powerDiff === null) return 0
    if (a.powerDiff === null) return 1
    if (b.powerDiff === null) return -1
    return a.powerDiff - b.powerDiff
  })

  return withDiff.slice(0, limit)
}
