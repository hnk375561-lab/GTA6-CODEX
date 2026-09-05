import { Vehicle } from '@/types'

export interface VehicleVariant {
  nombre: string
  precio: string
  power?: string
  transmission?: string
  consumption?: string
  dimensions?: string
  acceleration?: string
  speed?: string
  equipamiento?: string[]
  traccion?: string
  cilindrada?: string
  peso?: string
  baul?: string | number
  rendimiento?: {
    speed?: string
    acceleration?: string
  }
}

/**
 * Extrae las variantes de un vehículo con datos enriquecidos
 */
export function extractVehicleVariants(vehicle: any): VehicleVariant[] {
  const variants: VehicleVariant[] = []

  // Prioridad 1: variants array explícito
  if (vehicle.variants && Array.isArray(vehicle.variants) && vehicle.variants.length > 0) {
    vehicle.variants.forEach((v: any) => {
      variants.push({
        nombre: v.nombre || 'Base',
        precio: v.precio || '—',
        power: vehicle.power,
        transmission: vehicle.transmision,
        consumption: vehicle.consumo,
        dimensions: vehicle.dimensiones,
        acceleration: vehicle.performance?.acceleration,
        speed: vehicle.performance?.speed,
        equipamiento: vehicle.equipamiento,
        traccion: vehicle.traccion,
        cilindrada: vehicle.cilindrada,
        peso: vehicle.peso,
        baul: vehicle.baul,
        rendimiento: {
          speed: vehicle.performance?.speed,
          acceleration: vehicle.performance?.acceleration
        }
      })
    })
    return variants
  }

  // Prioridad 2: variants en relatedModels
  if (vehicle.relatedModels?.variants && Array.isArray(vehicle.relatedModels.variants)) {
    vehicle.relatedModels.variants.forEach((v: any) => {
      variants.push({
        nombre: v.nombre || 'Base',
        precio: v.precio || '—',
        power: vehicle.power,
        transmission: vehicle.transmision,
        consumption: vehicle.consumo,
        dimensions: vehicle.dimensiones,
        acceleration: vehicle.performance?.acceleration,
        speed: vehicle.performance?.speed,
        equipamiento: vehicle.equipamiento,
        traccion: vehicle.traccion,
        cilindrada: vehicle.cilindrada,
        peso: vehicle.peso,
        baul: vehicle.baul,
        rendimiento: {
          speed: vehicle.performance?.speed,
          acceleration: vehicle.performance?.acceleration
        }
      })
    })
    return variants
  }

  // Prioridad 3: variants en variants (array simple)
  if (vehicle.variants && Array.isArray(vehicle.variants) && vehicle.variants.length > 0) {
    vehicle.variants.forEach((v: any) => {
      if (typeof v === 'string') {
        variants.push({
          nombre: v,
          precio: '—',
          power: vehicle.power,
          transmission: vehicle.transmision,
          consumption: vehicle.consumo,
          dimensions: vehicle.dimensiones,
          acceleration: vehicle.performance?.acceleration,
          speed: vehicle.performance?.speed,
          equipamiento: vehicle.equipamiento,
          traccion: vehicle.traccion,
          cilindrada: vehicle.cilindrada,
          peso: vehicle.peso,
          baul: vehicle.baul,
          rendimiento: {
            speed: vehicle.performance?.speed,
            acceleration: vehicle.performance?.acceleration
          }
        })
      } else if (typeof v === 'object') {
        variants.push({
          nombre: v.nombre || 'Base',
          precio: v.precio || '—',
          power: v.power || vehicle.power,
          transmission: v.transmission || vehicle.transmision,
          consumption: v.consumption || vehicle.consumo,
          dimensions: v.dimensions || vehicle.dimensiones,
          acceleration: v.acceleration || vehicle.performance?.acceleration,
          speed: v.speed || vehicle.performance?.speed,
          equipamiento: v.equipamiento || vehicle.equipamiento,
          traccion: v.traccion || vehicle.traccion,
          cilindrada: v.cilindrada || vehicle.cilindrada,
          peso: v.peso || vehicle.peso,
          baul: v.baul || vehicle.baul,
        })
      }
    })
    return variants
  }

  // Fallback: variante base única
  return [{
    nombre: 'Base',
    precio: vehicle.price || '—',
    power: vehicle.power,
    transmission: vehicle.transmision,
    consumption: vehicle.consumo,
    dimensions: vehicle.dimensiones,
    acceleration: vehicle.performance?.acceleration,
    speed: vehicle.performance?.speed,
    equipamiento: vehicle.equipamiento,
    traccion: vehicle.traccion,
    cilindrada: vehicle.cilindrada,
    peso: vehicle.peso,
    baul: vehicle.baul,
    rendimiento: {
      speed: vehicle.performance?.speed,
      acceleration: vehicle.performance?.acceleration
    }
  }]
}

/**
 * Verifica si un vehículo tiene múltiples versiones/trims reales
 */
export function hasMultipleVariants(vehicle: any): boolean {
  const variants = extractVehicleVariants(vehicle)
  return variants.length > 1 && variants.some(v => v.nombre !== 'Base' || variants.length > 1)
}

/**
 * Obtiene el número de variantes reales
 */
export function getVariantCount(vehicle: any): number {
  const variants = extractVehicleVariants(vehicle)
  return variants.length
}

/**
 * Obtiene las diferencias clave entre variantes
 */
export function getVariantDifferences(variants: VehicleVariant[]): Record<string, string[]> {
  if (variants.length <= 1) return {}

  const differences: Record<string, string[]> = {}

  // Campos a comparar
  const fields = [
    { key: 'power', label: 'Potencia' },
    { key: 'transmission', label: 'Transmisión' },
    { key: 'consumption', label: 'Consumo' },
    { key: 'dimensions', label: 'Dimensiones' },
    { key: 'acceleration', label: 'Aceleración (0-100)' },
    { key: 'speed', label: 'Velocidad máx.' },
    { key: 'price', label: 'Precio' },
    { key: 'traction', label: 'Tracción' },
    { key: 'engine', label: 'Motor' },
    { key: 'weight', label: 'Peso' },
  ]

  fields.forEach(({ key, label }) => {
    const values = variants.map(v => (v as any)[key]).filter(Boolean)
    const uniqueValues = [...new Set(values)]
    if (uniqueValues.length > 1) {
      differences[label] = uniqueValues
    }
  })

  return differences
}