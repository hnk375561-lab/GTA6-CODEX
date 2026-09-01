import { EntityType, type Vehicle } from '@/types'

/**
 * Comparaciones fijas SEO (Product Growth Audit, sección 15, oportunidad
 * #11: "Comparaciones fijas dentro de mismo segmento" — long-tail de alta
 * intención). La Fase 19 del mismo audit ("DO NOT BUILD YET", punto 4)
 * descarta explícitamente generar TODAS las comparaciones posibles
 * (250×249/2 ≈ 31.000 pares): sería thin/duplicate content masivo.
 *
 * En vez de inventar una regla de emparejamiento nueva por segmento/precio
 * (que el audit deja como "pendiente"), esta capa reutiliza el dato que ya
 * existe y ya está editorialmente verificado: `relations[]` con
 * `relation: 'competidor'`, poblado en 212/250 fichas (472 pares únicos).
 * Es la misma fuente que ya alimenta `RelationsPanel` — acá solo se deriva
 * una URL canónica y estable por par para que cada comparación tenga una
 * página propia indexable, en vez de vivir solo detrás de `/comparar?v=`
 * (que es client-side y no es contenido inicial para un crawler).
 */

export interface FixedComparisonPair {
  slugA: string
  slugB: string
}

/** Slug canónico del par: siempre el mismo sin importar desde qué lado del
 *  par se navegue (A→B o B→A), para no duplicar la misma comparación bajo
 *  dos URLs distintas (contenido duplicado, justo lo que la Fase 19 pide
 *  evitar). Orden alfabético simple, sin significado semántico. */
export function fixedComparisonSlug(slugA: string, slugB: string): string {
  const [a, b] = [slugA, slugB].sort()
  return `${a}-vs-${b}`
}

/** Inversa de `fixedComparisonSlug`. Devuelve `null` si el formato no es
 *  el esperado (`algo-vs-algo`) — un vehículo real puede tener guiones en
 *  el slug, así que se prueba cada posición de "-vs-" en vez de asumir que
 *  es único, y se valida contra el catálogo real en el caller. */
export function splitFixedComparisonSlug(pairSlug: string): Array<[string, string]> {
  const marker = '-vs-'
  const candidates: Array<[string, string]> = []
  let searchFrom = 0
  while (true) {
    const idx = pairSlug.indexOf(marker, searchFrom)
    if (idx === -1) break
    const left = pairSlug.slice(0, idx)
    const right = pairSlug.slice(idx + marker.length)
    if (left && right) candidates.push([left, right])
    searchFrom = idx + 1
  }
  return candidates
}

/**
 * Todos los pares únicos con comparación fija, derivados de `competidor`.
 * Deduplicación bidireccional (si A lista a B y B lista a A, es un solo
 * par) vía el mismo slug canónico que usa la página.
 */
export function getFixedComparisonPairs(vehicles: Vehicle[]): FixedComparisonPair[] {
  const bySlug = new Map(vehicles.map((v) => [v.slug, v]))
  const seen = new Map<string, FixedComparisonPair>()

  for (const vehicle of vehicles) {
    for (const rel of vehicle.relations ?? []) {
      if (rel.relation !== 'competidor' || rel.targetType !== EntityType.VEHICLE) continue
      if (rel.targetSlug === vehicle.slug) continue
      if (!bySlug.has(rel.targetSlug)) continue // relación rota, no genera página 404

      const pairSlug = fixedComparisonSlug(vehicle.slug, rel.targetSlug)
      if (seen.has(pairSlug)) continue
      const [slugA, slugB] = [vehicle.slug, rel.targetSlug].sort()
      seen.set(pairSlug, { slugA, slugB })
    }
  }

  return Array.from(seen.values())
}

/** Resuelve un slug de URL (`/comparar/[pair]`) al par de vehículos real,
 *  o `null` si no corresponde a ninguna comparación fija válida. Usa el
 *  set ya calculado (no reconstruye la regla) para que la página 404 si
 *  alguien arma una URL con dos vehículos que no son competidores
 *  curados — evita servir comparaciones arbitrarias sin criterio bajo
 *  esta ruta, que es justo lo que la Fase 19 pide evitar. */
export function resolveFixedComparisonPair(
  pairSlug: string,
  vehicles: Vehicle[]
): FixedComparisonPair | null {
  const valid = getFixedComparisonPairs(vehicles)
  const validBySlug = new Map(valid.map((p) => [fixedComparisonSlug(p.slugA, p.slugB), p]))
  return validBySlug.get(pairSlug) ?? null
}
