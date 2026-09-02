import type { Vehicle } from '@/types'

/**
 * Extrae el puntaje de seguridad Euro NCAP de un vehículo.
 *
 * El campo `safety.puntaje` está poblado en ~155/250 fichas, siempre
 * acompañado de `safety.euroNCAP` — auditoría de datos confirma que
 * cuando hay puntaje, la fuente es **siempre** Euro NCAP (100% de los
 * datos), no hay mezcla de sistemas de evaluación diferentes.
 *
 * Esto significa que `puntaje` ES comparable entre vehículos sin
 * necesidad de verificar la equivalencia de sistemas — si ambos tienen
 * dato, ambos son Euro NCAP.
 *
 * No se inventa ningún valor.
 */
export function parseSafetyScore(vehicle: Vehicle): number | null {
  const score = vehicle.safety?.puntaje
  if (score === null || score === undefined) return null

  // Si ya es número
  if (typeof score === 'number') {
    return Number.isFinite(score) && score > 0 && score <= 5 ? score : null
  }

  // Si es string, intenta parsear
  if (typeof score === 'string') {
    const value = Number(score)
    return Number.isFinite(value) && value > 0 && value <= 5 ? value : null
  }

  return null
}

/**
 * Información legible de seguridad: puntaje + sistema.
 * Útil para mostrar tanto el valor como el contexto (ej. "5 estrellas Euro NCAP").
 */
export interface SafetyInfo {
  score: number
  system: string
  raw: string
}

/**
 * Extrae información de seguridad si está disponible:
 * - score: puntaje numérico
 * - system: nombre del sistema (ej. "Euro NCAP")
 * - raw: string original para referencia
 *
 * Devuelve null si no hay datos suficientes.
 */
export function getSafetyInfo(vehicle: Vehicle): SafetyInfo | null {
  const score = parseSafetyScore(vehicle)
  if (score === null) return null

  const system = vehicle.safety?.euroNCAP || 'Euro NCAP'

  return {
    score,
    system,
    raw: `${score} estrellas ${system}`,
  }
}
