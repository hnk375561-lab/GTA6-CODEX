import type { Vehicle } from '@/types'

/**
 * FASE 5 — Taxonomía de 2 niveles.
 * ============================================================
 * `class` (77 valores a la fecha, ej. "SUV compacto premium", "Sedán
 * ejecutivo") sigue siendo la fuente de verdad y el sub-filtro de
 * detalle — no se toca ningún dato de contenido, no se pierde
 * granularidad. `category` es una capa derivada, puramente
 * programática, por encima de `class`: agrupa las 77 clases en 12
 * categorías principales para navegación de alto nivel, páginas SEO
 * (`/categorias/[grupo]`) y "vehículos similares".
 *
 * Reemplaza a `vehicle-class-groups.ts` (7 grupos: SUV/Sedán/Pickup/
 * Hatchback/Deportivo/Moto/Otro). Este módulo:
 *   1. Usa una tabla EXPLÍCITA y auditada (`CLASS_TO_CATEGORY`) para las
 *      77 clases conocidas del dataset, en vez de matching por keyword
 *      — decisión determinista y trazable, no heurística "a ojo".
 *   2. Amplía el set de categorías a las 12 pedidas por FASE 5: SUV,
 *      Sedán, Hatchback, Pickup, Deportivo, Familiar, Coupé, Cabrio,
 *      Monovolumen, Utilitario, Moto, Otros. Ver informe de auditoría
 *      en `docs/fase-5-taxonomia-categorias.md` para el detalle
 *      clase-por-clase, los casos ambiguos y su justificación.
 *   3. Mantiene un fallback por keywords (misma lógica que el módulo
 *      anterior) SOLO para valores de `class` que aparezcan en el
 *      futuro y no estén todavía en la tabla explícita — nunca se
 *      inventa una categoría sin señal textual real, y cualquier clase
 *      nueva cae en 'Otros' si no matchea ninguna keyword conocida.
 *
 * Categorías sin representantes hoy (Coupé, Cabrio): se incluyen en la
 * taxonomía porque son carrocerías reales que pueden aparecer en el
 * catálogo a futuro (ver Sección "Escalabilidad" del informe), pero NO
 * generan página SEO propia hasta cruzar `MIN_VEHICLES_PER_SEO_CATEGORY`
 * — mismo criterio anti thin-content que ya regía el módulo anterior.
 */
export const VEHICLE_CATEGORIES = [
  'SUV',
  'Sedán',
  'Hatchback',
  'Pickup',
  'Deportivo',
  'Familiar',
  'Coupé',
  'Cabrio',
  'Monovolumen',
  'Utilitario',
  'Moto',
  'Otros',
] as const

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number]

/**
 * Umbral mínimo de vehículos en una categoría para que reciba página SEO
 * propia (`/categorias/[grupo]`) y aparezca en el sitemap. Única fuente
 * de verdad compartida entre ambos.
 */
export const MIN_VEHICLES_PER_SEO_CATEGORY = 8

/** Alias retrocompatible — algunos módulos históricos usaban este nombre. */
export const MIN_VEHICLES_PER_SEO_GROUP = MIN_VEHICLES_PER_SEO_CATEGORY

/**
 * Categorías elegibles para página SEO propia. Se excluye 'Otros' a
 * propósito (bucket residual, no una categoría automotriz real que
 * alguien busque en Google) — el resto entra o sale de generateStaticParams
 * únicamente según cruce `MIN_VEHICLES_PER_SEO_CATEGORY`, así que Coupé/
 * Cabrio/Familiar/Monovolumen/Utilitario ya están "listas" para generar
 * su página el día que el dataset las alcance, sin tocar código de nuevo.
 */
export const SEO_CATEGORIES = VEHICLE_CATEGORIES.filter((c) => c !== 'Otros')

/** Quita diacríticos para poder matchear "sedán"/"sedan" con el mismo
 *  keyword sin duplicar reglas por variante de acentuación. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Tabla explícita clase → categoría. Cubre las 77 clases detectadas en
 * `src/content/vehiculos/*.json` al momento de FASE 5 (auditoría
 * completa en `docs/fase-5-taxonomia-categorias.md`). Las claves están
 * normalizadas (sin acentos, minúsculas) para no depender de la
 * capitalización exacta del dato en disco.
 *
 * Casos ambiguos y su resolución (detalle completo en el informe):
 *  - "City car" → Hatchback: carrocería real de un city car es hatch.
 *  - "Hatchback/SUV", "Hatchback/SUV coupé" → SUV: se listan como
 *    híbridos pero el mercado los posiciona como SUV/crossover.
 *  - "Hatchback/Sedán" → Hatchback: se resuelve por el primer término.
 *  - "SUV coupé*" (3 variantes) → SUV: mantienen carrocería/altura de
 *    SUV pese al techo estilo coupé; no se crea una categoría "SUV
 *    coupé" separada por sólo 3 vehículos.
 *  - "Gran turismo", "Gran turismo de lujo" → Deportivo: agrupación
 *    histórica del sitio, GT se vende y busca como deportivo.
 *  - "Sedán/Wagon grande" → Familiar: "Wagon" es la carrocería familiar/
 *    station wagon, señal más fuerte que "Sedán" en este caso.
 *  - "Microcar eléctrico" → Otros: único caso sin categoría clara de
 *    las 12 (no es SUV/Sedán/Hatchback/etc. en ningún sentido real).
 */
const CLASS_TO_CATEGORY: Record<string, VehicleCategory> = {
  '4x4 compacto': 'SUV',
  'city car': 'Hatchback',
  'crossover fastback': 'SUV',
  deportivo: 'Deportivo',
  'deportivo electrico': 'Deportivo',
  'deportivo hibrido': 'Deportivo',
  'furgon compacto': 'Utilitario',
  furgon: 'Utilitario',
  'gran turismo': 'Deportivo',
  'gran turismo de lujo': 'Deportivo',
  hatchback: 'Hatchback',
  'hatchback compacto': 'Hatchback',
  'hatchback deportivo': 'Hatchback',
  'hatchback economico': 'Hatchback',
  'hatchback electrico': 'Hatchback',
  'hatchback premium': 'Hatchback',
  'hatchback urbano': 'Hatchback',
  'hatchback/suv': 'SUV',
  'hatchback/suv coupe': 'SUV',
  'hatchback/sedan': 'Hatchback',
  'microcar electrico': 'Otros',
  minivan: 'Monovolumen',
  'minivan compacta': 'Monovolumen',
  'minivan de lujo': 'Monovolumen',
  moto: 'Moto',
  'moto adventure': 'Moto',
  'moto aventura': 'Moto',
  'moto chopper': 'Moto',
  'moto clasica': 'Moto',
  'moto deportiva': 'Moto',
  'moto dual-sport 250cc': 'Moto',
  'moto enduro': 'Moto',
  'moto naked': 'Moto',
  'moto naked 200cc': 'Moto',
  'moto naked deportiva': 'Moto',
  'moto superdeportiva': 'Moto',
  'moto touring': 'Moto',
  'moto trail': 'Moto',
  'moto trail 150cc': 'Moto',
  'moto utilitaria': 'Moto',
  pickup: 'Pickup',
  'pickup compacta': 'Pickup',
  'pickup electrica': 'Pickup',
  'pickup grande': 'Pickup',
  'pickup mediana': 'Pickup',
  suv: 'SUV',
  'suv 4x4': 'SUV',
  'suv 4x4 grande': 'SUV',
  'suv 4x4 premium': 'SUV',
  'suv compacto': 'SUV',
  'suv compacto premium': 'SUV',
  'suv coupe': 'SUV',
  'suv coupe compacta': 'SUV',
  'suv coupe deportiva': 'SUV',
  'suv de lujo': 'SUV',
  'suv de ultralujo': 'SUV',
  'suv deportivo': 'SUV',
  'suv electrico': 'SUV',
  'suv grande': 'SUV',
  'suv mediano': 'SUV',
  'suv mediano premium': 'SUV',
  'suv premium': 'SUV',
  'suv premium compacta': 'SUV',
  'suv todoterreno': 'SUV',
  scooter: 'Moto',
  sedan: 'Sedán',
  'sedan compacto': 'Sedán',
  'sedan deportivo premium': 'Sedán',
  'sedan economico': 'Sedán',
  'sedan ejecutivo': 'Sedán',
  'sedan electrico': 'Sedán',
  'sedan fastback': 'Sedán',
  'sedan hibrido': 'Sedán',
  'sedan mediano': 'Sedán',
  'sedan premium': 'Sedán',
  'sedan/wagon grande': 'Familiar',
  utilitario: 'Utilitario',
}

/**
 * Reglas de fallback por keyword — solo se usan si `class` no está en
 * `CLASS_TO_CATEGORY` (valor nuevo, no auditado todavía). Orden de
 * prioridad: motos primero (para no caer en "deportivo"/"naked" como
 * categoría de auto), luego carrocerías específicas, recién después las
 * genéricas. Ningún valor del dataset actual pasa por acá — están todos
 * en la tabla explícita — pero mantiene el sistema robusto ante clases
 * nuevas sin requerir un deploy de código para clasificarlas.
 */
const FALLBACK_RULES: Array<{ category: VehicleCategory; keywords: string[] }> = [
  { category: 'Moto', keywords: ['moto', 'scooter'] },
  { category: 'Pickup', keywords: ['pickup'] },
  { category: 'Cabrio', keywords: ['cabrio', 'convertible', 'descapotable', 'roadster'] },
  { category: 'Monovolumen', keywords: ['minivan', 'monovolumen', 'van'] },
  { category: 'Familiar', keywords: ['wagon', 'familiar', 'break', 'combi'] },
  { category: 'SUV', keywords: ['suv', '4x4', 'crossover', 'todoterreno'] },
  { category: 'Sedán', keywords: ['sedan'] },
  { category: 'Hatchback', keywords: ['hatchback', 'city car'] },
  { category: 'Coupé', keywords: ['coupe'] },
  { category: 'Deportivo', keywords: ['deportivo', 'gran turismo'] },
  { category: 'Utilitario', keywords: ['utilitario', 'furgon', 'furgoneta'] },
]

/**
 * Deriva la categoría principal a partir del `class` detallado de una
 * ficha. Devuelve `null` si el vehículo no tiene `class` documentado
 * (nunca se inventa una categoría sin dato de base). Busca primero en
 * la tabla explícita y auditada; si el valor no está ahí, usa el
 * fallback por keyword; si ninguna keyword matchea, cae en 'Otros'.
 */
export function getVehicleCategory(vehicleClass: string | undefined | null): VehicleCategory | null {
  if (!vehicleClass) return null
  const normalized = normalize(vehicleClass)

  const exact = CLASS_TO_CATEGORY[normalized]
  if (exact) return exact

  for (const rule of FALLBACK_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category
    }
  }
  return 'Otros'
}

/** Slug de URL para una categoría (ej. "SUV" -> "suv", "Sedán" ->
 *  "sedan") — única fuente de verdad para `/categorias/[grupo]` y el
 *  sitemap. */
export function categoryToSlug(category: VehicleCategory): string {
  return normalize(category)
}

/** Inversa de `categoryToSlug`, restringida a las categorías "reales"
 *  que reciben página SEO (excluye 'Otros', ver `/categorias/[grupo]`). */
export function categoryFromSlug(slug: string): VehicleCategory | null {
  return SEO_CATEGORIES.find((c) => categoryToSlug(c) === slug) ?? null
}

export interface CategoryOption {
  group: VehicleCategory
  count: number
}

/** Igual criterio que `computeClassOptions` (mínimo N apariciones para
 *  contar como filtro real), pero agregado por categoría principal en
 *  vez de por `class` detallado. Ordenado por frecuencia descendente. */
export function computeCategoryOptions(vehicles: Vehicle[], minCount = 2): CategoryOption[] {
  const freq = new Map<VehicleCategory, number>()
  for (const vehicle of vehicles) {
    const category = getVehicleCategory(vehicle.class)
    if (!category) continue
    freq.set(category, (freq.get(category) ?? 0) + 1)
  }
  return Array.from(freq.entries())
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([group, count]) => ({ group, count }))
}

/**
 * Categorías que hoy tienen (o tendrían) página SEO real: superan
 * `MIN_VEHICLES_PER_SEO_CATEGORY` Y no son 'Otros'. Única fuente de
 * verdad para "¿qué categorías se anuncian?" — usada por
 * `generateStaticParams` de `/categorias/[grupo]`, por `sitemap.ts` y
 * por el hub `/categorias`, así los tres coinciden siempre sin
 * duplicar el filtro en cada lugar (FASE 6, gap de internal linking).
 */
export function computeSeoCategoryOptions(vehicles: Vehicle[]): CategoryOption[] {
  return computeCategoryOptions(vehicles, MIN_VEHICLES_PER_SEO_CATEGORY).filter(({ group }) =>
    (SEO_CATEGORIES as readonly string[]).includes(group)
  )
}

/**
 * URL de la página de categoría de un vehículo, o `null` si no aplica
 * (sin `class` documentada, o categoría 'Otros' — bucket residual sin
 * página SEO propia, ver arriba). Único punto usado para decidir si se
 * muestra el link/badge de categoría en la ficha de vehículo (FASE 6,
 * Gap 2) — nunca linkea a una categoría sin página real.
 */
export function categoryPageHref(vehicleClass: string | undefined | null): string | null {
  const category = getVehicleCategory(vehicleClass)
  if (!category || category === 'Otros') return null
  return `/categorias/${categoryToSlug(category)}`
}

/** Cantidad de ejemplos que rota `QuickSearchForm` en el placeholder de
 *  la home. Mismo valor que la longitud del fallback interno
 *  (`DEFAULT_EXAMPLES`) del componente, para que pasar la muestra real
 *  no cambie la cadencia percibida de la rotación. */
export const SEARCH_EXAMPLES_LIMIT = 6

/**
 * Muestra de títulos reales para el placeholder rotativo de
 * `QuickSearchForm` (FASE 5, Prioridad B — "Placeholder del buscador
 * con ejemplos reales rotando"). Se queda con el primer vehículo de
 * cada categoría principal distinta que encuentra (SUV, Sedán, Moto,
 * etc.), en vez de tomar los primeros N del catálogo sin criterio: si
 * `vehicles` llega ordenado por fabricante, "los primeros 6" pueden ser
 * puro Audi, y el placeholder pierde el punto de mostrar variedad real
 * de catálogo (autos y motos, distintas carrocerías). Determinista —
 * recorre `vehicles` en el orden en que llega y nunca usa `Math.random`,
 * así el HTML que arma el server component (`src/app/page.tsx`) coincide
 * siempre con lo que hidrata el cliente. Vehículos sin `class`
 * documentada (categoría no derivable) o sin `title` se saltean: nunca
 * entra un ejemplo vacío o inventado al placeholder. Si el catálogo
 * tiene menos categorías distintas que `limit`, devuelve menos de
 * `limit` títulos — `QuickSearchForm` ya maneja cualquier largo de
 * `examples` (incluido 0, cae a su propio fallback si el array llega
 * vacío).
 */
export function pickSearchExamples(vehicles: Vehicle[], limit = SEARCH_EXAMPLES_LIMIT): string[] {
  const seenCategories = new Set<VehicleCategory>()
  const examples: string[] = []
  for (const vehicle of vehicles) {
    if (examples.length >= limit) break
    if (!vehicle.title) continue
    const category = getVehicleCategory(vehicle.class)
    if (!category || seenCategories.has(category)) continue
    seenCategories.add(category)
    examples.push(vehicle.title)
  }
  return examples
}

export interface CategoryQuickFilterOption extends CategoryOption {
  /** Hasta `exampleLimit` títulos reales de esa categoría, mismo criterio
   *  determinista que `pickSearchExamples` (orden de aparición en
   *  `vehicles`, sin `Math.random`). */
  examples: string[]
}

/**
 * Datos para el filtro rápido de carrocería del panel Categorías de la
 * home (FASE 5, Prioridad B — "Filtro rápido inline por tipo de
 * carrocería en Categorías, sin salir de home"). Reusa
 * `computeSeoCategoryOptions` (ya filtra por `MIN_VEHICLES_PER_SEO_CATEGORY`
 * y excluye 'Otros') para que el CTA de cada chip ("Ver los N SUV") apunte
 * siempre a una página `/categorias/[grupo]` real — nunca a una categoría
 * sin página SEO ni a un bucket residual. A cada categoría le suma una
 * muestra de títulos reales para que el chip tenga contenido real para
 * mostrar inline apenas se selecciona, sin necesidad de navegar.
 */
export function computeCategoryQuickFilterOptions(
  vehicles: Vehicle[],
  exampleLimit = 4
): CategoryQuickFilterOption[] {
  return computeSeoCategoryOptions(vehicles).map(({ group, count }) => {
    const examples: string[] = []
    for (const vehicle of vehicles) {
      if (examples.length >= exampleLimit) break
      if (!vehicle.title) continue
      if (getVehicleCategory(vehicle.class) === group) examples.push(vehicle.title)
    }
    return { group, count, examples }
  })
}

// ---------------------------------------------------------------------
// Alias retrocompatibles (nombres del módulo anterior `vehicle-class-
// groups.ts`). Permiten migrar imports gradualmente sin romper nada que
// todavía no se haya actualizado a la terminología `category`.
// ---------------------------------------------------------------------
export type VehicleClassGroup = VehicleCategory
export type ClassGroupOption = CategoryOption
export const VEHICLE_CLASS_GROUPS = VEHICLE_CATEGORIES
export const SEO_CLASS_GROUPS = SEO_CATEGORIES
export const getVehicleClassGroup = getVehicleCategory
export const classGroupToSlug = categoryToSlug
export const classGroupFromSlug = categoryFromSlug
export const computeClassGroupOptions = computeCategoryOptions
