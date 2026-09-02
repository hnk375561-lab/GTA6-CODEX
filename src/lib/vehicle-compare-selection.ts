import type { Vehicle } from '@/types'

/**
 * Estrategia de prioridad para restaurar la selección de comparación:
 * 1. URL explícita (`?v=slug1,slug2,...`) tiene MÁXIMA prioridad — un link
 *    compartido nunca debe ser pisado por localStorage de quién lo abre.
 * 2. Si no hay URL explícita: recupera de localStorage.
 * 3. Si tampoco hay en localStorage: arrancar vacío.
 */

/**
 * Parsea e valida slugs de URL.
 * Entrada: string crudo de querystring (ej. "toyota-corolla,honda-civic")
 * Salida: array de slugs válidos, máximo MAX_COMPARE, solo si existen en dataset.
 * Nunca inventa slugs.
 */
export function parseUrlSelection(rawQuery: string | null, maxCompare: number, validSlugs: Set<string>): string[] {
  if (!rawQuery) return []
  const slugs = rawQuery.split(',').filter(Boolean)
  return slugs.filter((s) => validSlugs.has(s)).slice(0, maxCompare)
}

/**
 * Determina la selección "de verdad" respetando prioridad URL > localStorage.
 *
 * Entrada:
 * - hasUrlSelection: booleano, ¿hay `?v=` explícito en la URL?
 * - urlSelection: array validado desde parseUrlSelection
 * - storedSelection: array desde localStorage (ya validado)
 *
 * Salida:
 * - array de slugs que debe usarse como estado inicial
 * - booleano indicando si vino de URL (relevante para conocer la fuente)
 */
export function resolveInitialSelection(
  hasUrlSelection: boolean,
  urlSelection: string[],
  storedSelection: string[]
): { selection: string[]; fromUrl: boolean } {
  // URL explícita: siempre gana
  if (hasUrlSelection && urlSelection.length > 0) {
    return { selection: urlSelection, fromUrl: true }
  }

  // Sin URL: usa localStorage
  if (storedSelection.length > 0) {
    return { selection: storedSelection, fromUrl: false }
  }

  // Ni URL ni storage: vacío
  return { selection: [], fromUrl: false }
}

/**
 * Recolecta los vehículos reales correspondientes a los slugs.
 * Mantiene orden: si slugs es ["a", "c", "b"], el resultado estará en ese orden.
 * Filtra automáticamente slugs que no existen en el dataset (aunque
 * parseUrlSelection y resolveInitialSelection ya deberían haberlo hecho,
 * esta es la capa defensiva final).
 */
export function resolveVehicles(selection: string[], vehicles: Vehicle[]): Vehicle[] {
  const slugMap = new Map(vehicles.map((v) => [v.slug, v]))
  return selection
    .map((slug) => slugMap.get(slug))
    .filter((v): v is Vehicle => v !== undefined)
}
