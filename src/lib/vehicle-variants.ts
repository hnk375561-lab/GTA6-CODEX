import { Vehicle } from '@/types'

/**
 * Forma laxa de un vehículo/variante tal como aparece en JSON legacy que no
 * pasó por `VehicleSchema` (campos como `transmision`, `performance`,
 * `relatedModels.variants`, etc. no existen en el tipo `Vehicle` estricto).
 * Se tipa así, con todo opcional, en vez de `any`, para no perder el chequeo
 * de tipos del resto del archivo sin reescribir la lógica de extracción.
 */
interface LegacyVehicleLike {
  price?: string | null
  power?: string | null
  transmision?: string | null
  transmission?: string | null
  consumo?: string | null
  consumption?: string | null
  dimensiones?: string | null
  dimensions?: string | null
  performance?: {
    acceleration?: string
    speed?: string
    handling?: string
    braking?: string
  }
  acceleration?: string | null
  speed?: string | null
  equipamiento?: string[] | null
  traccion?: string | null
  cilindrada?: string | null
  peso?: string | number | null
  baul?: string | number | null
  nombre?: string | null
  precio?: string | null
  variants?: unknown[] | null
  relatedModels?: { variants?: unknown[] | null } | null
}

/** Normaliza un elemento crudo de un array de variantes a `LegacyVehicleLike | string`. */
function asVariantItem(v: unknown): LegacyVehicleLike | string {
  return v as LegacyVehicleLike | string
}

export interface VehicleVariant {
  nombre: string
  precio: string
  power?: string | null
  transmission?: string | null
  consumption?: string | null
  dimensions?: string | null
  acceleration?: string | null
  speed?: string | null
  equipamiento?: string[] | null
  traccion?: string | null
  cilindrada?: string | null
  peso?: string | number | null
  baul?: string | number | null
  rendimiento?: {
    speed?: string | null
    acceleration?: string
  }
}

/**
 * Extrae las variantes de un vehículo con datos enriquecidos
 */
export function extractVehicleVariants(vehicle: Vehicle & LegacyVehicleLike): VehicleVariant[] {
  const variants: VehicleVariant[] = []

  // Prioridad 1: variants array explícito
  if (vehicle.variants && Array.isArray(vehicle.variants) && vehicle.variants.length > 0) {
    (vehicle.variants as unknown[]).forEach((raw) => {
      const v = asVariantItem(raw) as LegacyVehicleLike
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
    (vehicle.relatedModels.variants as unknown[]).forEach((raw) => {
      const v = asVariantItem(raw) as LegacyVehicleLike
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
    (vehicle.variants as unknown[]).forEach((raw) => {
      const v = asVariantItem(raw)
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
export function hasMultipleVariants(vehicle: Vehicle & LegacyVehicleLike): boolean {
  const variants = extractVehicleVariants(vehicle)
  return variants.length > 1 && variants.some(v => v.nombre !== 'Base' || variants.length > 1)
}

/**
 * Obtiene el número de variantes reales
 */
export function getVariantCount(vehicle: Vehicle & LegacyVehicleLike): number {
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
    const values = variants
      .map(v => (v as unknown as Record<string, unknown>)[key])
      .filter((val): val is string => typeof val === 'string' && val.length > 0)
    const uniqueValues = [...new Set(values)]
    if (uniqueValues.length > 1) {
      differences[label] = uniqueValues
    }
  })

  return differences
}