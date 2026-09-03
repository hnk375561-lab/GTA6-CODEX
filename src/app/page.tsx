import Link from 'next/link'
import { Suspense, type CSSProperties } from 'react'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { SITE_NAME } from '@/config/site'
import {
  getFeaturedEntities,
  getEntityCount,
  getEntityCountsByType,
  getEntitiesByType,
  getMostRecentUpdate,
} from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateHomepageMetadata, generateBreadcrumbJsonLd, generateWebsiteJsonLd, generateFaqJsonLd, serializeJsonLd } from '@/lib/seo'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
import { pickSearchExamples, computeCategoryQuickFilterOptions, categoryPageHref, getVehicleCategory } from '@/lib/vehicle-category'
import { getAvailableRankings } from '@/lib/rankings'
import { getManufacturerMarqueeItems } from '@/lib/vehicle-manufacturers'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { Card } from '@/components/ui/Card'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { CountUp } from '@/components/ui/CountUp'
import { WordRotate } from '@/components/ui/WordRotate'
import { CategoryCardMedia } from '@/components/ui/CategoryCardMedia'
import { FinancingCalculator } from '@/components/ui/FinancingCalculator'
import { EntityCard } from '@/components/entities/EntityCard'
import { getCategoryPreviewImages } from '@/lib/images'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { QuickSearchForm } from '@/components/home/QuickSearchForm'
import { CategoryQuickFilter } from '@/components/home/CategoryQuickFilter'
import { ManufacturersMarquee } from '@/components/home/ManufacturersMarquee'
import { PinnedScrollStages, type Stage } from '@/components/home/PinnedScrollStages'
import { Reveal } from '@/components/home/StageProgress'
import { Parallax, TiltCard } from '@/components/home/Parallax'
import { HeroVehicleShowcaseV2, type HeroVehicleShowcaseItem } from '@/components/home/HeroVehicleShowcaseV2'
import { type HeroPromoBannerItem } from '@/components/home/HeroPromoBanner'
import { AdUnit } from '@/components/monetization/AdUnit'
import { CompareShowcase, type CompareShowcaseVehicle } from '@/components/home/CompareShowcase'
import { EvidenceSpotlight, type EvidenceHighlight } from '@/components/home/EvidenceSpotlight'
import { RankingsSpotlight, type RankingSpotlight } from '@/components/home/RankingsSpotlight'
import { FeaturedCarousel } from '@/components/home/FeaturedCarousel'
import { HomeFaqPanel, type FaqItem } from '@/components/home/HomeFaqPanel'
import { formatRelativeTime, formatVehicleDisplayName } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata()
}

/**
 * Home rediseñada (agosto 2026, ver conversación de rediseño): en vez de
 * una página larga que se scrollea sección por sección, el viewport queda
 * fijo y el scroll pasa de un panel al siguiente por crossfade — ver
 * `PinnedScrollStages`. Estética: blanco/tipografía grande (referencia
 * explícita: Apple / Vercel), cards oscuras como único acento de color
 * sobre el fondo blanco, en vez del hero oscuro con glow que tenía antes
 * la home. El resto del sitio (fichas, listados, comparador) no cambia.
 *
 * Fase 1–3 (informe de auditoría, §5): se agregan 4 paneles nuevos al
 * mismo sistema de crossfade — Comparador en vivo, Un dato-una fuente,
 * Rankings destacados y Financiamiento — en el orden narrativo propuesto:
 * Hero → Categorías → Comparador → Destacados → Evidencia → Rankings →
 * Noticias → Financiamiento → CTA final. Cada uno reusa datos y lógica ya
 * validada en otras páginas del sitio (rankings.ts, evidence.ts,
 * FinancingCalculator) — ningún panel nuevo inventa un cálculo o un dato
 * que no exista ya en otro lugar del sitio. El panel Comparador (1.3) es
 * la excepción a "otra página": no resume la lógica de `/comparar`, la
 * envuelve — reusa el mismo pool de vehículos `featured` que ya trae el
 * panel Destacados (`CompareShowcase`, ver comentario en su fetch más
 * abajo) en vez de los pares fijos de `fixed-comparisons.ts` que usaba la
 * versión anterior de este panel (`LiveCompareTeaser`).
 *
 * Riesgo a monitorear (mismo informe): con 9 paneles en vez de 5, cada
 * panel nuevo cuesta scroll físico completo antes de dar contenido, y el
 * usuario puede perder la sensación de progreso real. Mitigado en parte
 * por `scrollVh` por panel (paneles de lectura piden menos recorrido que
 * los de interacción — ver comentarios en cada `Stage` de abajo) y por el
 * agrupado de los dots de progreso (`PinnedScrollStages`), pero sigue
 * siendo una decisión a revisar con analytics de scroll-depth/abandono
 * post-release.
 */

const HERO_STAT_TYPES: EntityType[] = [EntityType.VEHICLE, EntityType.NEWS, EntityType.GUIDE]
const HERO_SUBTITLE_WORDS = ['auto', 'moto', 'ficha técnica', 'comparativa']
const CATEGORY_ORDER: EntityType[] = [EntityType.VEHICLE, EntityType.NEWS, EntityType.GUIDE]
const CATEGORY_ACCENT: Record<EntityType, string> = {
  [EntityType.VEHICLE]: '#c9a35f',
  [EntityType.NEWS]: '#ff6a1a',
  [EntityType.GUIDE]: '#3d84ff',
  [EntityType.MANUFACTURER]: '#8a8f98',
}

/** Mínimo de vehículos `featured` con imagen resuelta que necesita el panel
 *  "Comparador en vivo" para tener sentido: `CompareShowcase` ya se
 *  autoprotege devolviendo `null` con menos de 2 (no puede haber lado A y
 *  lado B), este umbral es el que usa `page.tsx` para decidir si el
 *  `Stage` completo se agrega o no al track (evita un panel vacío en vez
 *  de dejar que el componente cliente lo resuelva a destiempo). */
const MIN_COMPARE_SHOWCASE_POOL = 2

/** Cuántas fichas con fuente citada entran en el panel "Un dato, una
 *  fuente" — un grid de 3 columnas en desktop, así que un múltiplo de 3
 *  se ve prolijo tanto en el corte de 1 fila (mobile) como de 2 (desktop). */
const HOME_EVIDENCE_HIGHLIGHTS_LIMIT = 6

/** Cuántas posiciones de cada ranking se muestran en el panel "Rankings
 *  destacados" (2.3, mini-leaderboard: top 3, no el ranking completo) —
 *  el ranking completo (hasta `RANKING_TOP_N`) vive en `/rankings/[slug]`. */
const HOME_RANKING_TOP_ENTRIES = 3

/** Orden de prioridad de nivel de evidencia para elegir qué fichas
 *  destacar en "Un dato, una fuente": primero las de mayor certeza
 *  editorial (mismo orden que ya usa `EvidenceBlock`/`EVIDENCE_STAMP_META`,
 *  acá solo como criterio de selección, no de presentación). */
const EVIDENCE_LEVEL_PRIORITY: Record<EvidenceLevel, number> = {
  'oficial-nombrado': 0,
  'oficial-visual-multifuente': 1,
  'oficial-visual': 2,
  respaldado: 3,
  especulativo: 4,
}

/** Fallback del Suspense que envuelve `FinancingCalculator` dentro del
 *  panel de la home — mismo componente que ya usa `/financiamiento`
 *  (lee `useSearchParams` para el prefill opcional de precio), mismo
 *  placeholder mientras React hidrata. */
function FinancingCalculatorFallback() {
  return <div className="h-[420px] w-full animate-pulse rounded-xl border border-edge bg-surface-card" />
}

/** Mismo criterio de formato que `formatUsd` (privado en `rankings.ts`,
 *  no exportado) — se reimplementa acá en vez de tocar el barrel de ese
 *  archivo por un one-liner. Usado solo por los badges de spec del hero
 *  (`heroShowcaseVehicles` más abajo). */
function formatUsdShort(value: number): string {
  return `USD ${Math.round(value).toLocaleString('en-US')}`
}

export default async function HomePage() {
  // Solo vehículos: son los únicos tipos con foto real hoy (96.8% de
  // cobertura) — guías/noticias no tienen imagen propia, así que mezclarlas
  // acá dejaba cards sin foto (fallback CSS) en la sección "Destacados".
  // Límite en 12 (no 6): hoy hay 8 vehículos marcados `featured`, así que
  // esto ya trae "todos" los que existen — el 12 solo da margen para
  // cuando se marquen más sin tener que volver a tocar este número.
  //
  // `allVehicles`: catálogo completo de vehículos, necesario para "Un
  // dato, una fuente" (recorre todos los vehículos + noticias buscando
  // `evidence.primarySource`, ver más abajo). El panel Comparador en vivo
  // (1.3) NO lo necesita — su pool sale de `featured`, que ya viaja en
  // este mismo `Promise.all` — así que no se agrega ningún fetch nuevo acá
  // para ese panel. Rankings destacados tampoco: reusa
  // `getAvailableRankings()`, que hace su propio fetch equivalente puertas
  // adentro — mismo patrón que ya usan `/comparar` y `/rankings`, no una
  // fuente de datos nueva.
  //
  // Marquee de fabricantes (2.2, panel 2.5): `getManufacturerMarqueeItems()`
  // trae las entidades `MANUFACTURER` reales (75 en el dataset) con su logo
  // ya resuelto — mismo motivo que el resto de este `Promise.all`, no puede
  // resolverse en el componente cliente porque depende de `fs`.
  const [featured, totalCount, countsByType, allNews, allVehicles, availableRankings, manufacturerMarqueeItems, lastUpdate] =
    await Promise.all([
      getFeaturedEntities(12, EntityType.VEHICLE),
      getEntityCount(),
      getEntityCountsByType(),
      getEntitiesByType(EntityType.NEWS),
      getEntitiesByType(EntityType.VEHICLE),
      getAvailableRankings(),
      getManufacturerMarqueeItems(),
      getMostRecentUpdate(),
    ])
  // 5.B (Fase 5, prioridad B): dato en vivo en el eyebrow del hero — la
  // fecha de actualización más reciente de todo el catálogo (mismo dato
  // que ya usa `/rankings`, ahí como fecha absoluta; acá como relativa,
  // más legible en un eyebrow de una sola línea), vía `formatRelativeTime`
  // (`lib/utils.ts`, ya usado en otras partes del sitio — cae a fecha
  // absoluta corta sola después de ~30 días). `getMostRecentUpdate()`
  // devuelve `null` solo si no hay ninguna entidad cargada (caso borde,
  // no pasa en producción); el eyebrow se degrada a mostrar solo
  // `SITE_NAME` en ese caso, sin un segundo tramo de texto colgando.
  const lastUpdateLabel = lastUpdate ? formatRelativeTime(lastUpdate) : null
  const vehicles = allVehicles as Vehicle[]

  // 5.B (Fase 5, prioridad B): ejemplos reales para el placeholder
  // rotativo de `QuickSearchForm` — antes el componente solo tenía su
  // fallback interno (`DEFAULT_EXAMPLES`, 5 títulos fijos hardcodeados).
  // Se calcula sobre `vehicles` (catálogo completo, ya en memoria para
  // "Un dato, una fuente" más abajo) y no sobre `featured` (solo 8-12
  // fichas) para tener más margen de variedad real de categorías.
  // `pickSearchExamples` es determinista (sin `Math.random`), así que el
  // array que arma este server component en cada request es exactamente
  // el que recibe `QuickSearchForm` (client component) para hidratar —
  // sin riesgo de mismatch servidor/cliente.
  const searchExamples = pickSearchExamples(vehicles)

  // 5.B (Fase 5, prioridad B): datos del filtro rápido de carrocería del
  // panel Categorías — ver `computeCategoryQuickFilterOptions` en
  // `vehicle-category.ts` para el criterio completo (solo categorías con
  // página SEO real, con una muestra de títulos reales cada una).
  const categoryQuickFilterOptions = computeCategoryQuickFilterOptions(vehicles)

  const latestNews = [...allNews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
  const latestNewsImages = Object.fromEntries(
    latestNews.map((entity) => [entity.slug, resolveEntityDisplayImage(entity)])
  )
  // 5.B (Fase 5, prioridad B): fecha relativa por noticia, para
  // `EntityCard`'s `dateLabel` — mismo criterio que `latestNewsImages`
  // arriba (se resuelve acá, server component, y viaja ya formateada al
  // cliente para evitar cualquier desincronización de `new Date()` entre
  // build y visita — ver el comentario largo en `EntityCard.tsx`).
  const latestNewsDates = Object.fromEntries(
    latestNews.map((entity) => [entity.slug, formatRelativeTime(entity.createdAt)])
  )

  // Vehículos flotantes del hero (1.2): subset de `featured` con foto real
  // ya resuelta en servidor — `resolveEntityDisplayImage` depende de `fs`
  // y no puede llamarse desde `HeroVehicleShowcase` (client component), así
  // que se resuelve acá mismo y se pasa serializado. Límite en 4: la spec
  // pide rotar entre "3-4 vehículos featured", y con `featured` ya
  // ordenado por `updatedAt` (más reciente primero, ver `getFeaturedEntities`)
  // tomar los primeros N con imagen real prioriza fichas frescas sin
  // agregar un criterio de orden nuevo.
  const HERO_SHOWCASE_LIMIT = 4
  const heroShowcaseVehicles: HeroVehicleShowcaseItem[] = featured
    .map((vehicle): HeroVehicleShowcaseItem | null => {
      const image = resolveEntityDisplayImage(vehicle)
      if (!image) return null
      const v = vehicle as Vehicle
      // Auditoría "vida del hero" (sept. 2026): dato real para los dos
      // badges de spec que ahora se muestran sobre la foto (desktop) —
      // mismos parsers ya validados que usa el comparador/rankings, no
      // se inventa ni se re-parsea texto libre acá. Prioridad del
      // segundo badge: precio en USD (dato más comparable) y, si el
      // vehículo no tiene `priceStructured` en esa moneda, la velocidad
      // máxima (texto ya humano, ej. "241 km/h") como respaldo — nunca
      // ambos vacíos si al menos uno de los dos existe en la ficha.
      const powerHp = parsePowerHp(v)
      const priceUsd = parsePriceUsd(v)
      return {
        slug: vehicle.slug,
        title: vehicle.title,
        manufacturer: v.manufacturer,
        src: image.src,
        alt: image.alt,
        // FLIP experimental hero → card de Categorías (ver
        // `lib/view-transitions.ts`): reusa `categoryPageHref` (única
        // fuente de verdad, ya usada en la ficha de vehículo) en vez de
        // resolver la categoría de nuevo acá. `null` cuando el vehículo
        // no tiene categoría con página SEO propia — el componente cae
        // a su comportamiento decorativo previo en ese caso.
        categoryHref: categoryPageHref(v.class),
        // Segundo punto de click real (chip "Ver ficha →", ver
        // `HeroVehicleShowcase`): ficha específica de este vehículo, no
        // la categoría agrupada de arriba.
        detailHref: `/${EntityType.VEHICLE}/${vehicle.slug}`,
        powerLabel: powerHp !== null ? `${powerHp} hp` : null,
        secondaryStatLabel: priceUsd !== null ? formatUsdShort(priceUsd) : (v.performance?.speed ?? null),
        evidenceLevel: v.evidence?.level,
      }
    })
    .filter((item): item is HeroVehicleShowcaseItem => item !== null)
    .slice(0, HERO_SHOWCASE_LIMIT)

  // Anuncio propio del hero (bloque izquierdo, ver `HeroPromoBanner`):
  // REDISEÑO NUEVO (sept. 2026): UNA SOLA tarjeta promocional grande
  // (no múltiples ítems pequeños). No rotante, fija — el usuario ve el
  // mismo anuncio siempre. Se selecciona el primer vehículo `featured`
  // que tenga foto y que no esté ya en el carrusel de la derecha.
  const heroShowcaseSlugs = new Set(heroShowcaseVehicles.map((item) => item.slug))

  const heroPromoBannerItem: HeroPromoBannerItem | null = (() => {
    const candidate = featured.find((v) => {
      if (heroShowcaseSlugs.has(v.slug)) return false
      const img = resolveEntityDisplayImage(v)
      return Boolean(img)
    })
    if (!candidate) return null
    const v = candidate as Vehicle
    const image = resolveEntityDisplayImage(candidate)!
    const powerHp = parsePowerHp(v)
    const priceUsd = parsePriceUsd(v)
    const category = getVehicleCategory(v.class) ?? 'vehículo'
    return {
      eyebrow: `Por qué elegir un ${category.toLowerCase()}`,
      headline: formatVehicleDisplayName(v.manufacturer, v.title),
      description: v.description || null,
      src: image.src,
      alt: image.alt,
      detailHref: `/${EntityType.VEHICLE}/${candidate.slug}`,
      powerLabel: powerHp !== null ? `${powerHp} hp` : null,
      secondaryStatLabel: priceUsd !== null ? formatUsdShort(priceUsd) : (v.performance?.speed ?? null),
      evidenceLevel: v.evidence?.level,
      // Transparencia del placement (ver comentario largo en
      // `HeroPromoBannerItem['placementLabel']`): esta tarjeta es un
      // espacio elegido/curado, distinto del sello de evidencia que ya
      // trae el vehículo. Fijo por ahora ("Destacado") — el día que este
      // slot se venda de verdad, el único cambio necesario es reemplazar
      // este string por algo como "Patrocinado" o el nombre del partner.
      placementLabel: 'Destacado',
    }
  })()

  const breadcrumbLd = generateBreadcrumbJsonLd([{ label: 'Inicio', url: '/' }])
  const websiteLd = generateWebsiteJsonLd()

  // FAQ corta antes del footer (Prioridad C, ver comentario largo en
  // `HomeFaqPanel`). Preguntas elegidas para resolver la duda real más
  // probable de quien llega al final del recorrido (evidencia/rankings/
  // financiamiento ya vistos) — incluye el pivote GTA6→AutoFicha porque
  // es, en los hechos, la pregunta que más contexto rompe si alguien
  // llega al dominio esperando el juego (ver README, sección del pivote).
  const faqItems: FaqItem[] = [
    {
      question: '¿De dónde salen los datos de cada ficha?',
      answer:
        'De la ficha técnica oficial del fabricante o de fuentes verificables citadas en cada vehículo — nunca de una opinión editorial. Cada dato declara además un nivel de confianza explícito (ver la sección de evidencia de cada ficha), así que siempre podés chequear de dónde sale un número puntual.',
    },
    {
      question: '¿Los rankings son opiniones del sitio?',
      answer:
        'No: se calculan automáticamente ordenando el catálogo por un campo numérico real (potencia, precio en USD o año de lanzamiento), sin ratings inventados. Si un vehículo no tiene ese dato cargado, directamente no participa de ese ranking puntual, pero sigue disponible en el resto del sitio.',
    },
    {
      question: '¿Puedo comparar más de dos vehículos a la vez?',
      answer:
        'Sí, hasta 5 al mismo tiempo desde /vehiculos (seleccionás con el checkbox de cada ficha) o directamente en /comparar. El comparador en vivo de esta página es un adelanto rápido pensado para 2 vehículos puntuales.',
    },
    {
      question: '¿Dónde quedan guardados mis favoritos?',
      answer:
        'En este mismo navegador (localStorage), no en una cuenta — el sitio no pide registro. Eso significa que la lista no se sincroniza entre dispositivos ni sobrevive a borrar los datos del navegador.',
    },
    {
      question: '¿Este sitio tiene algo que ver con GTA 6?',
      answer:
        'No. El repositorio nació como una enciclopedia de fans sobre Grand Theft Auto VI y se reconvirtió por completo en este catálogo real de autos y motos — sin relación con Rockstar Games ni Take-Two Interactive. Es historia del proyecto, no un easter egg.',
    },
  ]
  const faqJsonLd = generateFaqJsonLd(faqItems)

  const featuredRelationCounts = Object.fromEntries(
    await Promise.all(featured.map(async (e) => [e.slug, await getBidirectionalRelationCount(e)] as const))
  )

  const categories = CATEGORY_ORDER.filter((type) => countsByType[type] > 0)
  const maxCategoryCount = Math.max(...categories.map((type) => countsByType[type]), 1)
  const categoryPreviews = Object.fromEntries(
    categories.map((type) => [type, getCategoryPreviewImages(type, 3)])
  ) as Record<EntityType, ReturnType<typeof getCategoryPreviewImages>>

  // Comparador en vivo (1.3): pool de vehículos `featured` con imagen ya
  // resuelta en servidor — mismo criterio que `heroShowcaseVehicles`
  // arriba (`resolveEntityDisplayImage` depende de `fs`, no puede llamarse
  // desde `CompareShowcase`, client component). A diferencia del hero, acá
  // no se descartan los vehículos sin imagen: `CompareShowcase` ya maneja
  // "Sin imagen" por vehículo (ver `VehiclePane`), y descartarlos acá
  // reduciría el pool disponible para "Cambiar A/B" sin necesidad. Viaja
  // completo al cliente porque esa es la gracia del panel: reelige al azar
  // DENTRO de este pool sin volver a pedir nada al servidor (criterio de
  // aceptación de la 1.3, "sin salir de home").
  const featuredVehicles = featured as Vehicle[]
  const compareShowcasePool: CompareShowcaseVehicle[] = featuredVehicles.map((vehicle) => ({
    slug: vehicle.slug,
    title: vehicle.title,
    manufacturer: vehicle.manufacturer,
    power: vehicle.power,
    price: vehicle.price,
    priceUsd: parsePriceUsd(vehicle),
    performance: vehicle.performance,
    evidence: vehicle.evidence,
    image: resolveEntityDisplayImage(vehicle),
  }))

  // Par inicial (A/B) elegido por contraste real, no al azar: recorre
  // `featuredVehicles` (mismos índices que `compareShowcasePool`, viene
  // del mismo `.map` de arriba) y se queda con el par de mayor diferencia
  // de potencia — mismo parser ya validado que usa `rankings.ts`,
  // `parsePowerHp`, que espera un `Vehicle` completo (por eso se calcula
  // acá y no sobre `compareShowcasePool`, que es un recorte de campos) —
  // para que el primer render ya muestre dos vehículos claramente
  // distintos en vez de depender de que el usuario toque "Cambiar" para
  // notarlo. Si ningún par tiene potencia parseable en ambos lados, cae a
  // los dos primeros del pool (`[0, 1]`) — nunca deja el panel sin par
  // inicial.
  let compareInitialIndexA = 0
  let compareInitialIndexB = 1
  let compareBestPowerDiff = -1
  for (let i = 0; i < featuredVehicles.length; i++) {
    for (let j = i + 1; j < featuredVehicles.length; j++) {
      const powerA = parsePowerHp(featuredVehicles[i])
      const powerB = parsePowerHp(featuredVehicles[j])
      if (powerA === null || powerB === null) continue
      const diff = Math.abs(powerA - powerB)
      if (diff > compareBestPowerDiff) {
        compareBestPowerDiff = diff
        compareInitialIndexA = i
        compareInitialIndexB = j
      }
    }
  }

  // Un dato, una fuente: fichas reales con `evidence.primarySource`
  // cargado, priorizadas por nivel de evidencia (más certeras primero) —
  // el texto de la fuente se muestra tal cual está en el contenido, nunca
  // reescrito ni resumido para este panel.
  const evidenceHighlights: EvidenceHighlight[] = [...vehicles, ...allNews]
    .filter((entity): entity is typeof entity & { evidence: NonNullable<typeof entity.evidence> } =>
      Boolean(entity.evidence?.primarySource)
    )
    .sort((a, b) => {
      const priorityDiff = EVIDENCE_LEVEL_PRIORITY[a.evidence.level] - EVIDENCE_LEVEL_PRIORITY[b.evidence.level]
      if (priorityDiff !== 0) return priorityDiff
      return a.title.localeCompare(b.title, 'es')
    })
    .slice(0, HOME_EVIDENCE_HIGHLIGHTS_LIMIT)
    .map((entity) => {
      const meta = EVIDENCE_STAMP_META[entity.evidence.level]
      return {
        slug: entity.slug,
        entityType: entity.type,
        title: entity.title,
        levelIcon: meta.icon,
        levelLabel: meta.shortLabel,
        levelClassName: meta.className,
        primarySource: entity.evidence.primarySource as string,
      }
    })

  // Rankings destacados: los mismos 4 rankings reales de `/rankings`, ya
  // filtrados por `getAvailableRankings()` con el mismo umbral de
  // contenido (`RANKING_MIN_ELIGIBLE`) — acá solo se recorta el top N que
  // entra en el panel compacto.
  const rankingsSpotlightData: RankingSpotlight[] = availableRankings.map((ranking) => ({
    slug: ranking.def.slug,
    shortTitle: ranking.def.shortTitle,
    title: ranking.def.title,
    // 2.3: se manda cruda (no solo `metricLabel`, ya formateado) para que
    // `RankingsSpotlight` pueda pasarla por `getBestValueIndices`
    // (`vehicle-compare-best.ts`) y marcar empates en el mejor valor del
    // top 3 — mismo criterio 'asc'/'desc' que ya ordena `computeRanking`,
    // solo se traduce acá a 'min'/'max' (el vocabulario de esa utilidad).
    direction: ranking.def.direction === 'asc' ? 'min' : 'max',
    eligibleCount: ranking.eligibleCount,
    topEntries: ranking.entries.slice(0, HOME_RANKING_TOP_ENTRIES).map((entry) => ({
      position: entry.position,
      vehicleSlug: entry.vehicle.slug,
      vehicleTitle: entry.vehicle.title,
      metricValue: entry.metricValue,
      metricLabel: entry.metricLabel,
    })),
  }))

  const stages: Stage[] = [
    // 1. Hero — cada bloque entra en cascada (título → subtítulo → stats →
    // CTAs/buscador) en vez de aparecer todo junto con el fundido del panel.
    // `Reveal` lee el progreso local del panel por Context (no por prop
    // función): así este contenido puede seguir viviendo en un Server
    // Component que hace `await` a la base del expediente.
    //
    // `scrollVh` alto (210): panel de entrada, con la cascada más larga
    // (7 bloques) — pide el recorrido más pausado del track.
    {
      id: 'hero',
      label: 'Inicio',
      scrollVh: 210,
      content: (
        <div className="relative mx-auto w-full max-w-[90rem] text-center">
          <Reveal index={0} total={7} options={{ distance: 22 }}>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
              {SITE_NAME}
              {lastUpdateLabel && (
                <>
                  {' '}
                  <span aria-hidden="true" className="text-neutral-300">·</span>{' '}
                  <span className="normal-case tracking-normal">Actualizado {lastUpdateLabel}</span>
                </>
              )}
            </p>
            <Parallax strength={8}>
              <h1 className="font-display text-6xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-7xl lg:text-8xl">
                Cada{' '}
                <WordRotate words={HERO_SUBTITLE_WORDS} className="text-gradient-vice" />{' '}
                a un clic
              </h1>
            </Parallax>
          </Reveal>

          <Reveal index={1} total={7} className="mx-auto mt-6 max-w-xl">
            <p className="text-lg text-neutral-500 sm:text-xl">
              Specs reales del fabricante — para que compares antes de comprar.
            </p>
          </Reveal>

          <Reveal
            index={2}
            total={7}
            className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-10 gap-y-4"
          >
            {HERO_STAT_TYPES.map((type) => (
              <div key={type} className="flex flex-col items-center gap-0.5">
                <span className="font-display text-5xl font-bold text-neutral-900">
                  <CountUp end={countsByType[type] ?? 0} />
                </span>
                <span className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                  {ENTITY_TYPE_LABELS[type]}
                </span>
              </div>
            ))}
            <div className="hidden h-10 w-px bg-neutral-200 sm:block" aria-hidden="true" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-display text-5xl font-bold text-gradient-vice">
                <CountUp end={totalCount} />
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                {totalCount === 1 ? 'Entrada total' : 'Entradas totales'}
              </span>
            </div>
          </Reveal>

          <Reveal index={3} total={7}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/vehiculos"
                className="cta-shine tap-scale inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-10 py-5 text-lg font-semibold text-white transition-transform hover:-translate-y-1"
              >
                Ver fichas de autos <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/comparar"
                className="tap-scale inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-10 py-5 text-lg font-semibold text-neutral-900 transition-transform hover:-translate-y-1"
              >
                Comparar vehículos
              </Link>
            </div>

            <div className="mx-auto mt-6 max-w-xl">
              <QuickSearchForm examples={searchExamples} />
            </div>
          </Reveal>

          {/* Franja "showroom" del hero (2do rediseño, sept. 2026):
              una sola fila 100% horizontal con scroll-snap real —
              anuncio propio (`HeroSelfPromoCard`) como primera card,
              seguido de una card panorámica por cada vehículo `featured`
              (`HeroVehicleShowcase`, ver ese archivo para el detalle
              completo del cambio de arquitectura). Va acá, en el flujo
              normal del documento, justo debajo de CTAs/buscador y antes
              de la grilla de categorías (ubicación acordada
              explícitamente, ver conversación de rediseño) — eso no
              cambió respecto de la primera versión.
              Lo que sí cambió: el wrapper pasa de `max-w-[100rem]`
              (columna angosta centrada) a `w-full` sin techo de ancho —
              la fila necesita ocupar el 100% del ancho real del panel
              del hero (`max-w-[90rem]` heredado del contenedor padre,
              ver el `<div>` raíz de este panel) para que "100%
              horizontal" sea literal y no quede recortada por un
              max-width propio innecesario. La anima el mismo `Reveal`
              que el resto de los bloques del panel — sin mecanismo de
              scroll vertical propio ni superposición con nada (el track
              interno de `FeaturedCarousel` scrollea en su propio eje
              horizontal, ver esa nota en `HeroVehicleShowcase.tsx`). */}
          <Reveal index={4} total={7} className="mx-auto mt-14 w-full text-left">
            {/* Encabezado de la franja (nuevo, sept. 2026): antes la
                franja arrancaba directo en la tarjeta de anuncio propio,
                sin ningún texto que explicara qué está mirando el
                usuario — se apoyaba solo en el `aria-label` interno del
                carrusel ("Vehículos destacados"), invisible para
                cualquiera que no use lector de pantalla. Visualmente la
                franja podía leerse como "banner publicitario suelto" en
                vez de "selección editorial". Este encabezado, con el
                mismo patrón eyebrow+h2 que ya usa el panel de
                Categorías más abajo (consistencia visual, no un
                componente nuevo), aclara que lo que sigue es curaduría
                real (`featured` + evidencia verificada, ambos
                mecanismos ya existentes — nada inventado) antes de que
                aparezca la tarjeta de placement. */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                  Selección
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                  Lo que vale la pena mirar primero
                </h2>
              </div>
              <p className="hidden max-w-xs text-sm leading-relaxed text-neutral-500 sm:block">
                Fichas completas con evidencia verificada — no es el catálogo entero, es lo que ya revisamos a fondo.
              </p>
            </div>
            <HeroVehicleShowcaseV2 vehicles={heroShowcaseVehicles} promoBannerItem={heroPromoBannerItem} />
          </Reveal>

          {/* Preview de categorías directo en el hero: contenido real
              (no relleno) para que el panel tenga más para mostrar sin
              alargar el tiempo que tarda en aparecer cada ficha — eso lo
              sigue regulando `Reveal`/`scrollVh` sin tocarse acá. */}
          <Reveal
            index={5}
            total={7}
            className="mx-auto mt-14 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3"
          >
            {categories.map((type) => {
              const accent = CATEGORY_ACCENT[type]
              return (
                <Link
                  key={type}
                  href={`/${type}`}
                  className="tap-scale group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: accent }}
                  >
                    <CategoryIcon type={type} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-neutral-900">
                      {ENTITY_TYPE_LABELS[type]}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {countsByType[type]} {countsByType[type] === 1 ? 'entrada' : 'entradas'}
                    </span>
                  </span>
                </Link>
              )
            })}
          </Reveal>

          {/* Franja de confianza al pie del hero: contenido nuevo (no
              relleno) que responde a "más cosas en el hero", separado del
              grid de categorías de arriba. Estático — no pide datos extra
              — así que no compite con `Promise.all` de la carga inicial. */}
          <Reveal
            index={6}
            total={7}
            className="mx-auto mt-14 grid w-full max-w-[70rem] grid-cols-1 gap-6 border-t border-neutral-200 pt-10 text-left sm:grid-cols-3"
          >
            {[
              {
                title: 'Fuente verificable',
                body: 'Cada ficha cita de dónde sale el dato: comunicado, medio o filtración — nunca relleno.',
              },
              {
                title: 'Nivel de evidencia',
                body: 'Confirmado, rumor o estimación nuestra: siempre marcado, así sabés cuánto confiar en cada especificación.',
              },
              {
                title: 'Comparador real',
                body: 'Poné vehículos lado a lado con las mismas unidades y fuentes, sin cambiar de pestaña.',
              },
            ].map((item) => (
              <div key={item.title}>
                <p className="font-display text-base font-semibold text-neutral-900">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      ),
    },
    // 2. Categorías — cada card entra con su propio delay en la cascada.
    // `scrollVh` default (sin especificar): grid de lectura/navegación,
    // ni tan liviano como "Evidencia" ni tan pesado como un panel
    // interactivo — el valor por defecto (210) le queda bien.
    {
      id: 'categorias',
      label: 'Categorías',
      content: (
        <div className="mx-auto w-full max-w-[96rem]">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Categorías
          </p>
          <h2 className="mb-10 text-center font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Explorá por sección
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((type, i) => {
              const density = Math.max(6, Math.round((countsByType[type] / maxCategoryCount) * 100))
              const accent = CATEGORY_ACCENT[type]
              return (
                <Reveal key={type} index={i} total={categories.length} className="h-full">
                  <Link
                    href={`/${type}`}
                    className="group block h-full"
                    style={{ '--auto-corner-color': accent } as CSSProperties}
                  >
                    <TiltCard className="h-full">
                      <Card hoverable className="relative flex h-full flex-col overflow-hidden !p-0 text-center">
                        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
                          <CategoryCardMedia previews={categoryPreviews[type]} />
                          <div className="absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur">
                            <CategoryIcon type={type} className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="relative z-10 flex flex-1 flex-col gap-2 px-5 py-4">
                          <p className="font-semibold text-neutral-900">{ENTITY_TYPE_LABELS[type]}</p>
                          <p className="text-sm text-neutral-500">
                            {countsByType[type]} {countsByType[type] === 1 ? 'entrada' : 'entradas'}
                          </p>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-edge" aria-hidden="true">
                            <div className="h-full rounded-full" style={{ width: `${density}%`, background: accent }} />
                          </div>
                        </div>
                      </Card>
                    </TiltCard>
                  </Link>
                </Reveal>
              )
            })}
          </div>

          {/* Filtro rápido de carrocería (5.B): panel inline propio, no
              parte de la grilla de categorías de arriba (esa es a nivel
              EntityType — Vehículos/Noticias/Guías — mientras que esto
              filtra por carrocería DENTRO de Vehículos, un nivel más
              específico, ver `vehicle-category.ts`). Va antes del
              marquee de fabricantes para mantener la lectura "primero
              explorás por sección, después por carrocería, después por
              marca". */}
          <Reveal index={categories.length} total={categories.length + 3}>
            <CategoryQuickFilter options={categoryQuickFilterOptions} />
          </Reveal>

          {/* 2.5 — Marquee de fabricantes: mismo panel que Categorías (no
              un `Stage` propio, ver spec 2.2) para no sumar otro tramo
              completo de scroll físico solo por un listado de logos. */}
          {manufacturerMarqueeItems.length > 0 && (
            <Reveal index={categories.length + 1} total={categories.length + 3} className="mt-12">
              <ManufacturersMarquee manufacturers={manufacturerMarqueeItems} />
            </Reveal>
          )}

          <Reveal index={categories.length + 2} total={categories.length + 3} className="mt-8 text-center">
            <Link href="/buscar" className="text-sm font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900">
              Ver las {totalCount} entradas del expediente →
            </Link>
          </Reveal>
        </div>
      ),
    },
    // 3. Comparador en vivo — panel nuevo (Fase 1), reimplementado en la
    // 1.3 sobre `CompareShowcase` (foto + `StatBar` + `EvidenceBlock` de
    // dos vehículos `featured`, con botón "Cambiar" por lado que reelige
    // al azar dentro del pool, sin salir de home). Interactivo, así que
    // pide más recorrido físico que uno de solo lectura: `scrollVh` 230,
    // por encima del default, para que el usuario tenga tiempo de notar
    // que puede tocar "Cambiar" antes de que el scroll lo empuje al
    // siguiente panel. Solo se agrega si el pool alcanza el mínimo para
    // tener lado A y lado B (evita un panel vacío si el catálogo todavía
    // no tiene suficientes vehículos `featured`).
    ...(compareShowcasePool.length >= MIN_COMPARE_SHOWCASE_POOL
      ? [
          {
            id: 'comparador',
            label: 'Comparador',
            scrollVh: 230,
            content: (
              <div className="mx-auto w-full max-w-[80rem] text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                  Comparador
                </p>
                <h2 className="mb-10 font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
                  Comparador en vivo
                </h2>
                <CompareShowcase
                  pool={compareShowcasePool}
                  initialIndexA={compareInitialIndexA}
                  initialIndexB={compareInitialIndexB}
                />
              </div>
            ),
          } satisfies Stage,
        ]
      : []),
    // 4. Destacados
    ...(featured.length > 0
      ? [
          {
            id: 'destacados',
            label: 'Destacados',
            content: (
              <div className="mx-auto w-full max-w-[96rem]">
                <div className="mb-10 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                      Destacados
                    </p>
                    <h2 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
                      Lo más relevante
                    </h2>
                  </div>
                  <Link href="/galeria" className="hidden shrink-0 text-sm font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900 sm:inline-block">
                    Ver galería completa
                  </Link>
                </div>
                {/* 3.2: carrusel horizontal (un solo eje de scroll) en vez
                    del grid con `max-h-[46vh] overflow-y-auto` anterior —
                    ese patrón anidaba un scroll vertical propio dentro del
                    panel del track pineado, que ya scrollea en vertical
                    (doble-scroll marcado como riesgoso en §16 de la
                    auditoría). Cada ítem lleva ancho fijo + `snap-start`;
                    `FeaturedCarousel` aporta el `snap-x` y el drag con
                    mouse (ver ese componente para el detalle). */}
                <FeaturedCarousel>
                  {featured.map((entity, i) => (
                    <div
                      key={`${entity.type}-${entity.slug}`}
                      className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[22%]"
                    >
                      <Reveal index={i} total={featured.length}>
                        <TiltCard>
                          <EntityCard
                            entity={entity}
                            image={resolveEntityDisplayImage(entity)}
                            clipUrl={undefined}
                            relationCount={featuredRelationCounts[entity.slug]}
                            size="compact"
                          />
                        </TiltCard>
                      </Reveal>
                    </div>
                  ))}
                </FeaturedCarousel>
              </div>
            ),
          } satisfies Stage,
        ]
      : []),
    // 5. Un dato, una fuente — panel nuevo (Fase 2). De solo lectura (una
    // cita por card, nada para tocar), así que pide el recorrido más
    // corto de los paneles nuevos: `scrollVh` 160, por debajo del
    // default — es justo el panel de lectura que el informe usa como
    // ejemplo de "puede pedir menos que uno de interacción".
    ...(evidenceHighlights.length > 0
      ? [
          {
            id: 'evidencia',
            label: 'Evidencia',
            scrollVh: 160,
            content: <EvidenceSpotlight highlights={evidenceHighlights} />,
          } satisfies Stage,
        ]
      : []),
    // 6. Rankings destacados — panel nuevo (Fase 3). Interactivo (tabs
    // entre 4 rankings), `scrollVh` 210 — mismo peso que el hero, menos
    // que el comparador (acá solo se cambia de tab, no hay tanto para
    // explorar por ranking como pares distintos en el comparador).
    ...(rankingsSpotlightData.length > 0
      ? [
          {
            id: 'rankings',
            label: 'Rankings',
            scrollVh: 210,
            content: <RankingsSpotlight rankings={rankingsSpotlightData} />,
          } satisfies Stage,
        ]
      : []),
    // 7. Noticias
    ...(latestNews.length > 0
      ? [
          {
            id: 'noticias',
            label: 'Noticias',
            content: (
              <div className="mx-auto w-full max-w-[96rem]">
                <div className="mb-10 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                      Últimas noticias
                    </p>
                    <h2 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
                      Novedades del sector
                    </h2>
                  </div>
                  <Link href="/noticias" className="hidden shrink-0 text-sm font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900 sm:inline-block">
                    Ver todas
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {latestNews.map((entity, i) => (
                    <Reveal key={`${entity.type}-${entity.slug}`} index={i} total={latestNews.length}>
                      <TiltCard>
                        <EntityCard
                          entity={entity}
                          image={latestNewsImages[entity.slug]}
                          dateLabel={latestNewsDates[entity.slug]}
                        />
                      </TiltCard>
                    </Reveal>
                  ))}
                </div>

                {/* AdUnit reubicado acá (5.B, Fase 5 — "revisar posición
                    del AdUnit del hero"): antes vivía en la cascada del
                    hero (`Reveal index={3.5}`, panel 1), compitiendo por
                    atención con el H1/CTA/buscador — justo el contenido
                    con más peso de conversión de todo el sitio, y
                    encima el primer panel que ve cualquier visitante
                    nuevo. Se mueve al panel de Noticias por dos motivos:
                    (1) es un panel de solo lectura al que se llega tras
                    haber recorrido Categorías/Comparador/Destacados/
                    Evidencia — protagonismo mucho menor que el hero, sin
                    competir con ningún CTA de conversión; (2) "debajo de
                    un listado de contenido editorial" es el patrón de
                    ubicación estándar de un in-feed/after-content ad
                    unit, coherente con cómo se presenta en el resto del
                    sitio (ficha de vehículo, comparador, fabricantes —
                    ver esos `AdUnit` en `[entityType]/[slug]/page.tsx`,
                    `comparar/page.tsx` y `fabricantes/page.tsx`, todos
                    después del contenido principal, nunca antes). Mismo
                    slot real de AdSense (`3119092668`, ver CHANGELOG —
                    no se crea un slot nuevo), solo cambia el tracking
                    label para reflejar la nueva ubicación en GA4. */}
                <AdUnit
                  slotId="3119092668"
                  format="responsive"
                  className="mt-10"
                  dataTrackingLabel="ad-home-noticias"
                />
              </div>
            ),
          } satisfies Stage,
        ]
      : []),
    // 8. Financiamiento — panel nuevo (Fase 1). Reusa `FinancingCalculator`
    // tal cual (mismo componente que `/financiamiento`, con su propio
    // `useSearchParams` — de ahí el `Suspense`). Interactivo y con varios
    // campos para completar, así que pide el recorrido más largo de los
    // paneles nuevos: `scrollVh` 240.
    {
      id: 'financiamiento',
      label: 'Financiamiento',
      scrollVh: 240,
      content: (
        <div className="mx-auto w-full max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Financiamiento
          </p>
          <h2 className="mb-4 font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Simulá tu cuota
          </h2>
          <p className="mx-auto mb-8 max-w-md text-neutral-500">
            Precio, entrega, tasa y plazo — la misma calculadora de{' '}
            <Link href="/financiamiento" className="underline underline-offset-4 hover:text-neutral-900">
              /financiamiento
            </Link>
            , acá mismo.
          </p>
          <div className="mx-auto max-w-xl text-left">
            <Suspense fallback={<FinancingCalculatorFallback />}>
              <FinancingCalculator />
            </Suspense>
          </div>
        </div>
      ),
    },
    // 9. CTA final — panel de salida, liviano (nada nuevo para leer,
    // solo dos links), `scrollVh` 150 por debajo del default.
    //
    // 3.3: el CTA del hero (panel 1) tiene foco "explorar" — "Ver fichas
    // de autos" / "Comparar vehículos" más el buscador rápido, para
    // alguien que recién llega y todavía no vio nada. Este panel es lo
    // último del recorrido: para cuando se llega acá ya se pasó por
    // evidencia citada (panel 5), rankings reales (panel 6) y la cuota
    // simulada (panel 8), así que repetir el mismo mensaje de "explorar/
    // buscar" (como el heading y botón viejos, que literalmente decían
    // "¿Buscás algo puntual?" / "Buscar en el expediente" — casi el mismo
    // verbo que ya se usó en el hero) desaprovecha ese recorrido. El
    // mensaje acá pasa a "ya tenés con qué decidir": no es información
    // nueva, es el cierre que confirma que ya se vio lo necesario para
    // elegir con confianza. El link a `/buscar` se mantiene como opción
    // secundaria (sigue siendo útil si alguien busca un modelo puntual),
    // pero deja de ser el mensaje principal del panel.
    {
      id: 'decidir',
      label: 'Decidí',
      scrollVh: 150,
      content: (
        <div className="mx-auto w-full max-w-2xl text-center">
          <Reveal index={0} total={3} options={{ distance: 22 }}>
            <h2 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
              Ya tenés con qué decidir
            </h2>
          </Reveal>
          <Reveal index={1} total={3} className="mx-auto mt-4 max-w-md">
            <p className="text-neutral-500">
              Evidencia citada, rankings reales y tu cuota simulada — lo que ya viste alcanza
              para elegir sin dudar, no hace falta buscar en otro lado.
            </p>
          </Reveal>
          <Reveal index={2} total={3} className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/vehiculos" className="cta-shine tap-scale inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-8 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5">
              Elegí tu vehículo <span aria-hidden="true">→</span>
            </Link>
            <Link href="/buscar" className="tap-scale inline-flex items-center justify-center rounded-full border border-neutral-300 px-8 py-4 font-semibold text-neutral-900 transition-transform hover:-translate-y-0.5">
              Buscar un modelo puntual
            </Link>
          </Reveal>
        </div>
      ),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
      <PinnedScrollStages stages={stages} />
      {/* Prioridad C: fuera del track de crossfade a propósito — acá el
          documento ya volvió a scroll normal (ver comentario en
          `HomeFaqPanel`), entre el final del track y `<Footer />`
          (renderizado por `layout.tsx`, no por esta página). */}
      <HomeFaqPanel items={faqItems} />
    </>
  )
}
