import { EntityType, type Entity, type Vehicle } from '@/types'

/**
 * Extrae el número inicial (hp) del campo `power` de un vehículo, texto
 * libre tipo "255 hp" o "200 hp (2.0 TFSI base)" — siempre toma el
 * primer número, ignora cualquier aclaración entre paréntesis. Devuelve
 * `null` si el campo no está o no arranca con un número reconocible (no
 * pasó en las 250 fichas actuales, pero contenido futuro podría no
 * seguir el formato — nunca se inventa un valor).
 */
export function parsePowerHp(vehicle: Vehicle): number | null {
  const raw = vehicle.power
  if (!raw) return null
  const match = /^\s*(\d+(?:\.\d+)?)/.exec(raw)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

export interface PowerBounds {
  min: number
  max: number
}

/**
 * Rango [min, max] de potencia (hp) disponible entre las entidades dadas,
 * redondeado hacia afuera al múltiplo de 10 más cercano para que los
 * inputs del filtro arranquen en números "redondos". Devuelve `null`
 * (sin filtro) si el tipo no es Vehículo, o si hay menos de
 * `MIN_ATTRIBUTE_COUNT` vehículos con potencia parseable, o si todos
 * comparten exactamente el mismo valor (un filtro de rango no aporta
 * nada sobre un único valor).
 */
export function computePowerBounds(entities: Entity[], type: EntityType): PowerBounds | null {
  if (type !== EntityType.VEHICLE) return null
  const values = entities
    .map((e) => parsePowerHp(e as Vehicle))
    .filter((v): v is number => v !== null)
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return null

  return {
    min: Math.floor(min / 10) * 10,
    max: Math.ceil(max / 10) * 10,
  }
}
