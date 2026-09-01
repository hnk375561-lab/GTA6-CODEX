/**
 * Determina qué vehículo(s) tienen el "mejor valor" en una fila del
 * comparador (`VehicleCompareTable`), para poder destacarlos visualmente
 * (audit2.md, sección 16 — quick win #13: "Destacar el mejor valor por
 * fila en la tabla de comparación").
 *
 * Deliberadamente NO se aplica a todas las filas. Solo a las que tienen
 * una dirección de "mejor" inequívoca y un valor numérico ya confiable:
 * - Precio (USD, vía `parsePriceUsd`): menor es mejor.
 * - Las 4 métricas de rendimiento (vía `performanceToScale`): mayor es
 *   mejor.
 *
 * Se excluyen a propósito `consumo`, `dimensiones`, `transmisión`,
 * `tracción` y `clase`: son texto libre heterogéneo (ver comentario en
 * `vehicle-price.ts` sobre por qué no se inventan conversiones/parseos
 * ambiguos) — `consumo` en particular mezcla unidades donde "más alto"
 * significa cosas opuestas según la unidad (l/100km vs. MPGe/km·l), así
 * que destacar un "mejor" ahí sería, en los hechos, inventar un dato.
 */
export type BestDirection = 'min' | 'max'

/**
 * Devuelve el set de índices (posición dentro de `values`) que comparten
 * el mejor valor de la fila. Si hay empate, se destacan todos los
 * empatados. Si no hay al menos 2 valores parseables y distintos entre
 * sí, devuelve un set vacío — no tiene sentido "destacar" el único dato
 * disponible o un empate total entre todos los vehículos comparados.
 */
export function getBestValueIndices(values: Array<number | null>, direction: BestDirection): Set<number> {
  const parseable = values.filter((v): v is number => v !== null)
  if (parseable.length < 2) return new Set()

  const distinct = new Set(parseable)
  if (distinct.size < 2) return new Set()

  const best = direction === 'min' ? Math.min(...parseable) : Math.max(...parseable)

  const indices = new Set<number>()
  values.forEach((v, i) => {
    if (v === best) indices.add(i)
  })
  return indices
}
