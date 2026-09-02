import { EntityType, type Entity, type Vehicle } from '@/types'

/** Límites de sanidad para `anoLanzamiento`: cualquier valor fuera de
 *  este rango se trata como inválido (typo de captura, año de otro
 *  campo pegado por error, etc.) y nunca se usa para el filtro — mismo
 *  espíritu que `parsePowerHp`/`parsePriceUsd`: nunca se inventa ni se
 *  "corrige" un dato, simplemente se descarta si no es confiable. El
 *  límite superior deja margen para modelos anunciados con año-modelo
 *  adelantado (ej. 2027 anunciado en 2026).
 */
const MIN_SANE_YEAR = 1900
const MAX_SANE_YEAR = new Date().getFullYear() + 2

/**
 * Extrae el año de lanzamiento de un vehículo a partir de
 * `anoLanzamiento`, que en el contenido real viene indistintamente como
 * `number` o `string` (confirmado sobre las 250 fichas — ver
 * `VehicleSchema` en `@/types/schemas.ts`). Nunca inventa un año: si el
 * campo falta, es `null`, no es numérico, o cae fuera de un rango
 * razonable (`MIN_SANE_YEAR`–`MAX_SANE_YEAR`), devuelve `null` — el
 * vehículo simplemente no participa del filtro de año, igual que ya hace
 * `parsePowerHp` cuando `power` no es parseable.
 */
export function parseYear(vehicle: Vehicle): number | null {
  const raw = vehicle.anoLanzamiento
  if (raw === null || raw === undefined) return null

  const value = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null
  if (value < MIN_SANE_YEAR || value > MAX_SANE_YEAR) return null

  return value
}

export interface YearBounds {
  min: number
  max: number
}

/**
 * Rango [min, max] de año de lanzamiento disponible entre las entidades
 * dadas. Devuelve `null` (sin filtro) si el tipo no es Vehículo, si hay
 * menos de 2 vehículos con año válido, o si todos comparten exactamente
 * el mismo año — mismo criterio que `computePowerBounds`/
 * `computePriceBounds`. A diferencia de esos dos, no se redondea el
 * límite hacia afuera: un año ya es un número "redondo" por naturaleza,
 * redondear a la década distorsionaría el rango real disponible.
 */
export function computeYearBounds(entities: Entity[], type: EntityType): YearBounds | null {
  if (type !== EntityType.VEHICLE) return null
  const values = entities
    .map((e) => parseYear(e as Vehicle))
    .filter((v): v is number => v !== null)
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return null

  return { min, max }
}
