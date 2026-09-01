import type { Vehicle } from '@/types'

/**
 * Extrae el volumen numérico del baúl de un vehículo.
 *
 * El dataset actual usa dos campos:
 * - `baul`: volumen principal (usado en ~196/250 fichas, numérico o string),
 *   típicamente el baúl con asientos traseros sin reclinación.
 * - `maleteroMin`: volumen mínimo cuando los asientos están reclinados
 *   (usado en ~50/250, menos frecuente).
 *
 * Esta función prefiere `baul` (más poblado); si no existe o no es numérico,
 * devuelve null (no intenta `maleteroMin` como fallback — se tratan como
 * métricasindependientes en caso de que en el futuro se quiera usar ambas).
 *
 * No se inventa ningún valor.
 */
export function parseTrunkVolume(vehicle: Vehicle): number | null {
  const raw = vehicle.baul
  if (raw === null || raw === undefined) return null

  // Si ya es número, úsalo directamente
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null
  }

  // Si es string, intenta parsear como número
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    // Si contiene caracteres no numéricos (ej. "280-480 l" o "variable"), no es comparable
    if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
      return null
    }
    const value = Number(trimmed)
    return Number.isFinite(value) && value > 0 ? value : null
  }

  return null
}
