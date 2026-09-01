import type { Vehicle } from '@/types'

/**
 * Estados posibles para cada equipamiento en la matriz comparativa.
 * 'present': el vehículo declara tener este equipamiento.
 * 'absent': el vehículo no lo declara (dato negativo explícito).
 * 'unknown': el vehículo no tiene información de equipamiento o no declara este item.
 */
export type EquipmentStatus = 'present' | 'absent' | 'unknown'

/**
 * Información de un equipamiento en contexto de comparación.
 */
export interface EquipmentItem {
  name: string
  status: EquipmentStatus
}

/**
 * Extrae el array de equipamiento de un vehículo.
 * Devuelve un array de strings si existe, o null si no.
 * No se inventa ningún equipamiento.
 */
export function getVehicleEquipment(vehicle: Vehicle): string[] | null {
  const equipment = vehicle.equipamiento
  if (!equipment || !Array.isArray(equipment) || equipment.length === 0) {
    return null
  }
  // Filtrar strings vacíos
  return equipment.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) || null
}

/**
 * Recolecta todos los equipamientos únicos de un set de vehículos,
 * ordenados alfabéticamente. Útil para armar el encabezado/eje-Y de la
 * matriz comparativa.
 */
export function getAllEquipmentNames(vehicles: Vehicle[]): string[] {
  const names = new Set<string>()
  vehicles.forEach((v) => {
    const equipment = getVehicleEquipment(v)
    equipment?.forEach((item) => names.add(item))
  })
  return Array.from(names).sort()
}

/**
 * Determina el estado de un equipamiento específico para un vehículo.
 * 'present': el equipamiento existe en el array.
 * 'absent': el vehículo tiene equipamiento pero este no está (dato negativo).
 * 'unknown': el vehículo no tiene dato de equipamiento.
 */
export function getEquipmentStatus(vehicle: Vehicle, equipmentName: string): EquipmentStatus {
  const equipment = getVehicleEquipment(vehicle)

  // Sin dato de equipamiento → 'unknown'
  if (equipment === null) {
    return 'unknown'
  }

  // Tiene dato: verifica presencia
  const found = equipment.some((item) => item.toLowerCase() === equipmentName.toLowerCase())
  return found ? 'present' : 'absent'
}

/**
 * Arma la fila de equipamiento para un vehículo específico.
 * Devuelve un array de EquipmentItem, uno por equipamiento en la lista
 * universal, con el estado (presente/ausente/desconocido).
 */
export function getVehicleEquipmentMatrix(vehicle: Vehicle, allEquipmentNames: string[]): EquipmentItem[] {
  return allEquipmentNames.map((name) => ({
    name,
    status: getEquipmentStatus(vehicle, name),
  }))
}
