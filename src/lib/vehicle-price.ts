import { EntityType, type Entity, type Vehicle } from '@/types'

/**
 * FASE 2 (discovery — filtro de precio): esta función se apoya
 * EXCLUSIVAMENTE en `vehicle.priceStructured`, el modelo de datos
 * construido en FASE 1 (`scripts/lib/price-classifier.mjs` +
 * `scripts/migrate-price-structure.mjs`), y ya no re-parsea el texto
 * libre `price` con una regex propia como hacía antes de esta fase.
 * `priceStructured` es la única fuente de verdad para operaciones
 * numéricas sobre precio — `price` (el string original) se sigue
 * mostrando tal cual en la ficha, pero no participa de ningún cálculo acá.
 *
 * Extrae un precio comparable en USD, sin inventar ninguna conversión de
 * moneda.
 *
 * REGLA DE MONEDA (PASO 2 de la fase): el dataset real mezcla USD, ARS,
 * EUR, GBP, JPY, MYR, CAD, BRL, MXN, CNY, KRW, AUD, CLP, COP (confirmado
 * contra las 250 fichas — ver reporte de validación de la fase). Mezclar
 * esas monedas en un único rango numérico daría una comparación falsa
 * (ARS 50.000.000 no es "más caro" que USD 34.900 solo porque el número
 * es mayor). AutoFicha no tiene una tasa de cambio propia ni la inventa:
 * el filtro de precio opera exclusivamente sobre la moneda dominante y
 * de mercado principal del catálogo (USD, ~59% de las fichas con precio
 * estructurado) — mismo recorte que ya usaba la versión anterior de este
 * archivo. Un vehículo con `priceStructured.currency !== 'USD'`
 * simplemente no participa del filtro de precio (no se convierte, no se
 * excluye del catálogo general). Esto es una limitación conocida y
 * documentada, no un bug: ver PASO 2 y el reporte final de la fase.
 *
 * `priceStructured.type`:
 *  - `'single'` / `'starting'`: usa `amount` directamente.
 *  - `'range'`: usa `min` (el piso del rango) — mismo criterio que ya
 *    usaba `parsePriceUsd` antes de esta fase para "USD 33.000 - USD
 *    45.000", nunca un promedio inventado.
 *  - `'unstructured'` (o `priceStructured` ausente/`null`, contenido no
 *    migrado por FASE 1): devuelve `null`. El vehículo no debe tratarse
 *    como precio 0 ni recibir un precio estimado.
 */
export function parsePriceUsd(vehicle: Vehicle): number | null {
  const structured = vehicle.priceStructured
  if (!structured || structured.currency !== 'USD') return null

  if (structured.type === 'single' || structured.type === 'starting') {
    return typeof structured.amount === 'number' && Number.isFinite(structured.amount) && structured.amount > 0
      ? structured.amount
      : null
  }

  if (structured.type === 'range') {
    return typeof structured.min === 'number' && Number.isFinite(structured.min) && structured.min > 0
      ? structured.min
      : null
  }

  // 'unstructured' u otro valor no reconocido.
  return null
}

export interface PriceBounds {
  min: number
  max: number
}

/**
 * Rango [min, max] de precio (USD) disponible entre las entidades dadas,
 * redondeado hacia afuera a la centena más cercana. Se apoya en
 * `parsePriceUsd` (exclusivamente `priceStructured`, ver arriba). Devuelve
 * `null` (sin filtro) si el tipo no es Vehículo, si hay menos de 2
 * vehículos con precio USD parseable, o si todos comparten el mismo
 * valor — mismo criterio que `computePowerBounds`.
 */
export function computePriceBounds(entities: Entity[], type: EntityType): PriceBounds | null {
  if (type !== EntityType.VEHICLE) return null
  const values = entities
    .map((e) => parsePriceUsd(e as Vehicle))
    .filter((v): v is number => v !== null)
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return null

  return {
    min: Math.floor(min / 100) * 100,
    max: Math.ceil(max / 100) * 100,
  }
}

/**
 * FASE 4 (PASO 3): detecta si el set de vehículos tiene monedas mixtas
 * en sus precios estructurados. Útil para determinar si una comparación
 * de precio es válida o si hay que avisar al usuario.
 *
 * Devuelve:
 * - `true` si hay 2+ monedas distintas representadas en los vehículos
 * - `false` si todos son la misma moneda, o no hay datos de precio
 *
 * Regla: solo se consideran vehículos con `priceStructured` poblado y
 * `currency` no-null. Vehículos sin precio estructurado se ignoran.
 */
export function hasMixedPriceCurrencies(vehicles: Vehicle[]): boolean {
  const currencies = new Set<string>()

  vehicles.forEach((v) => {
    const structured = v.priceStructured
    if (structured && structured.currency) {
      currencies.add(structured.currency)
    }
  })

  return currencies.size > 1
}
