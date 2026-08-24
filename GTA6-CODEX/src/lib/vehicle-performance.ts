import type { Vehicle } from '@/types'

/**
 * Convierte valores cualitativos de rendimiento ("Media-Alta", "Muy alta"...)
 * a una escala numérica 1-5, usada tanto para las barras visuales
 * (EntityMetadata) como para ordenar vehículos por rendimiento
 * (EntityListExplorer). Única fuente de esta heurística — antes vivía
 * duplicada solo en EntityMetadata.
 */
export function performanceToScale(value?: string): number | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('n/a')) return null
  if (v.includes('muy alta')) return 5
  if (v.includes('media-alta')) return 3
  if (v.includes('alta')) return 4
  if (v.includes('media')) return 2
  if (v.includes('baja')) return 1
  return null
}

/**
 * Puntaje de rendimiento combinado (0-20) de un vehículo, sumando las 4
 * métricas disponibles. Se usa exclusivamente para ordenar — nunca se
 * muestra como número en la UI (las barras individuales siguen siendo la
 * representación visual real, este puntaje solo define un orden relativo
 * entre vehículos cuando el usuario elige "Más veloces").
 */
export function vehiclePerformanceScore(vehicle: Vehicle): number {
  const p = vehicle.performance
  if (!p) return 0
  return (
    (performanceToScale(p.speed) ?? 0) +
    (performanceToScale(p.acceleration) ?? 0) +
    (performanceToScale(p.handling) ?? 0) +
    (performanceToScale(p.braking) ?? 0)
  )
}

/** True si el vehículo tiene al menos un dato de rendimiento cargado. */
export function hasPerformanceData(vehicle: Vehicle): boolean {
  const p = vehicle.performance
  if (!p) return false
  return Boolean(
    performanceToScale(p.speed) ||
      performanceToScale(p.acceleration) ||
      performanceToScale(p.handling) ||
      performanceToScale(p.braking)
  )
}
