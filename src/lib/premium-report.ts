/**
 * Reporte comparativo premium — primer canal de monetización del sitio
 * que cobra directo a la persona usuaria (no a un negocio/afiliado), vía
 * Mercado Pago Checkout Pro. Contexto completo en
 * `docs/monetizacion-plan.md` (sección "Reporte comparativo premium").
 *
 * Qué vende: el PDF de `/api/premium-report/pdf` con la comparación
 * completa (specs + evidencia citada) de 2 a 5 vehículos ya elegidos en
 * `/comparar`, para guardar/compartir/imprimir — la tabla en pantalla no
 * se puede descargar ni llevar a una concesionaria en papel.
 *
 * Este archivo es intencionalmente el único lugar con el precio y el
 * mínimo/máximo de vehículos, para no tener el número de precio
 * duplicado entre el botón, la ruta que crea la preferencia y el
 * generador de PDF.
 */

export const PREMIUM_REPORT_PRICE_ARS = 990
export const PREMIUM_REPORT_MIN_VEHICLES = 2
export const PREMIUM_REPORT_MAX_VEHICLES = 5

/**
 * Referencia externa que Mercado Pago devuelve intacta en el objeto de
 * pago (`external_reference`). Se arma a partir de los slugs *ordenados*
 * (no como los eligió la persona) para que da lo mismo comparar
 * `[a, b]` que `[b, a]` — es el mismo reporte.
 */
export function buildExternalReference(slugs: string[]): string {
  return `premium-report:${normalizeSlugs(slugs).join('+')}`
}

export function normalizeSlugs(slugs: string[]): string[] {
  return Array.from(new Set(slugs.map((s) => s.trim()).filter(Boolean))).sort()
}

export function isValidSlugSelection(slugs: string[]): boolean {
  const normalized = normalizeSlugs(slugs)
  return normalized.length >= PREMIUM_REPORT_MIN_VEHICLES && normalized.length <= PREMIUM_REPORT_MAX_VEHICLES
}

/**
 * Confirma que un pago aprobado corresponde EXACTAMENTE a los slugs que
 * se están por descargar — sin esto, alguien podría pagar el reporte más
 * barato (2 autos) y reusar el `payment_id` aprobado para pedir el PDF de
 * una selección distinta vía `?slugs=`.
 */
export function externalReferenceMatchesSlugs(externalReference: string | null, slugs: string[]): boolean {
  if (!externalReference) return false
  return externalReference === buildExternalReference(slugs)
}
