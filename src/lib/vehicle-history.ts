import { Vehicle } from '@/types'

export interface ModelYearEntry {
  year: number
  isCurrent: boolean
  isFacelift: boolean
  generation: string
  specs?: {
    power?: string
    price?: string
    transmission?: string
    consumption?: string
    dimensions?: string
  }
  notes?: string
}

export interface ModelYearHistory {
  vehicle: Vehicle
  years: ModelYearEntry[]
  hasHistory: boolean
  launchYear: number
  currentYear: number
  generations: Array<{
    number: number
    name: string
    startYear: number
    endYear: number | 'presente'
    faceliftYear?: number
    chassisCode?: string
  }>
}

/**
 * Extrae el año de inicio de producción desde varios campos disponibles
 */
function extractStartYear(vehicle: Vehicle): number {
  // Prioridad 1: generacionInfo.anoInicio (si existe)
  if (vehicle.generacionInfo?.anoInicio !== null && vehicle.generacionInfo?.anoInicio !== undefined) {
    return vehicle.generacionInfo.anoInicio
  }

  // Prioridad 2: anoLanzamiento
  if (vehicle.anoLanzamiento) {
    return vehicle.anoLanzamiento
  }

  // Prioridad 3: anoProduccion (extraer año de inicio del rango)
  if (vehicle.anoProduccion) {
    const match = vehicle.anoProduccion.match(/(\d{4})/)
    if (match) return parseInt(match[1], 10)
  }

  // Prioridad 4: productionHistory.generacionActual.años
  if (vehicle.productionHistory?.generacionActual?.años) {
    const match = vehicle.productionHistory.generacionActual.años.match(/(\d{4})/)
    if (match) return parseInt(match[1], 10)
  }

  // Fallback: año actual
  return new Date().getFullYear()
}

/**
 * Extrae el año actual o final de producción
 */
function extractEndYear(vehicle: Vehicle): number | 'presente' {
  // Prioridad 1: generacionInfo.anoFin
  if (vehicle.generacionInfo?.anoFin !== null && vehicle.generacionInfo?.anoFin !== undefined) {
    return vehicle.generacionInfo.anoFin
  }

  // Prioridad 2: anoProduccion (extraer año final del rango)
  if (vehicle.anoProduccion) {
    const match = vehicle.anoProduccion.match(/(\d{4})\s*-\s*(\d{4}|presente)/i)
    if (match) {
      const end = match[2].toLowerCase()
      if (end === 'presente') return 'presente'
      return parseInt(end, 10)
    }
    // Si solo hay un año
    const single = vehicle.anoProduccion.match(/(\d{4})/)
    if (single) return parseInt(single[1], 10)
  }

  // Prioridad 3: productionHistory.generacionActual.años
  if (vehicle.productionHistory?.generacionActual?.años) {
    const match = vehicle.productionHistory.generacionActual.años.match(/(\d{4})\s*-\s*(\d{4}|presente)/i)
    if (match) {
      const end = match[2].toLowerCase()
      if (end === 'presente') return 'presente'
      return parseInt(end, 10)
    }
  }

  return 'presente'
}

/**
 * Genera entradas de años para el historial
 */
function generateYearEntries(vehicle: Vehicle): ModelYearEntry[] {
  const startYear = extractStartYear(vehicle)
  const endYear = extractEndYear(vehicle)
  const currentYear = new Date().getFullYear()
  const endYearNum = endYear === 'presente' ? currentYear : (typeof endYear === 'number' ? endYear : currentYear)

  const faceliftYear = vehicle.generacionInfo?.faceliftAno !== null ? vehicle.generacionInfo?.faceliftAno : undefined
  const isFacelift = vehicle.generacionInfo?.facelift === true

  const entries: ModelYearEntry[] = []

  // Generar entradas para cada año desde el inicio hasta el actual
  for (let year = startYear; year <= endYearNum; year++) {
    const isCurrent = year === currentYear
    const isFaceliftYear = faceliftYear !== undefined && year === faceliftYear

    // Determinar generación
    let generation = vehicle.generacion || 'Generación actual'
    const genNum = vehicle.generacionInfo?.numero
    if (genNum !== null && genNum !== undefined) {
      generation = `${genNum}ª generación${vehicle.generacionInfo?.codigoChasis ? ` (${vehicle.generacionInfo.codigoChasis})` : ''}`
    }

    // Detectar si es año de facelift
    const isFacelift = faceliftYear !== undefined && year === faceliftYear

    entries.push({
      year,
      isCurrent,
      isFacelift: isFaceliftYear,
      generation,
      notes: isFaceliftYear ? `Facelift / Actualización ${vehicle.generacionInfo?.faceliftAno}` : undefined
    })
  }

  return entries.reverse() // Más reciente primero
}

/**
 * Extrae información de generaciones
 */
function extractGenerations(vehicle: Vehicle) {
  const generations: Array<{
    number: number
    name: string
    startYear: number
    endYear: number | 'presente'
    faceliftYear?: number
    chassisCode?: string
  }> = []

  const genNum = vehicle.generacionInfo?.numero
  const genName = vehicle.generacion || 'Generación actual'
  const chassisCode = vehicle.generacionInfo?.codigoChasis || undefined
  const faceliftYear = vehicle.generacionInfo?.faceliftAno !== null ? vehicle.generacionInfo?.faceliftAno : undefined
  const startYear = extractStartYear(vehicle)
  const endYear = extractEndYear(vehicle)
  const endYearNum = endYear === 'presente' ? new Date().getFullYear() : (typeof endYear === 'number' ? endYear : new Date().getFullYear())

  if (genNum !== null && genNum !== undefined) {
    generations.push({
      number: genNum,
      name: genNum === 1 ? 'Primera generación' : `${genNum}ª generación`,
      startYear,
      endYear: endYear === 'presente' ? 'presente' : endYearNum,
      faceliftYear,
      chassisCode
    })
  } else if (vehicle.generacion) {
    generations.push({
      number: 1,
      name: vehicle.generacion,
      startYear,
      endYear: endYear === 'presente' ? 'presente' : endYearNum,
      faceliftYear,
      chassisCode
    })
  }

  return generations
}

/**
 * Obtiene el historial completo de años de modelo para un vehículo
 */
export function getModelYearHistory(vehicle: Vehicle): ModelYearHistory {
  const years = generateYearEntries(vehicle)
  const generations = extractGenerations(vehicle)
  const launchYear = extractStartYear(vehicle)
  const endYear = extractEndYear(vehicle)
  const currentYear = new Date().getFullYear()

  // Determinar si tiene historial suficiente (más de 1 año o tiene facelift)
  const hasHistory = years.length > 1 || (vehicle.generacionInfo?.faceliftAno !== null)

  return {
    vehicle,
    years,
    hasHistory,
    launchYear,
    currentYear,
    generations
  }
}

/**
 * Verifica si un vehículo tiene suficiente historial para generar página
 */
export function hasModelYearHistory(vehicle: Vehicle): boolean {
  const history = getModelYearHistory(vehicle)
  return history.hasHistory
}

/**
 * Obtiene las especificaciones clave por año (para tabla comparativa)
 */
export function getYearSpecs(vehicle: Vehicle, year: number) {
  // Por ahora retornamos specs genéricas del vehículo actual
  // En el futuro se podría enriquecer con datos históricos específicos por año
  return {
    power: vehicle.power,
    price: vehicle.price,
    consumption: vehicle.consumo,
    transmission: vehicle.transmision,
    dimensions: vehicle.dimensiones,
    acceleration: vehicle.performance?.acceleration,
    speed: vehicle.performance?.speed
  }
}