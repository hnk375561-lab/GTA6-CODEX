import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { SITE_NAME } from '@/config/site'
import {
  getFeaturedEntities,
  getEntityCount,
  getEntityCountsByType,
  getEntitiesByType,
} from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateHomepageMetadata, generateBreadcrumbJsonLd, generateWebsiteJsonLd, generateFaqJsonLd, serializeJsonLd } from '@/lib/seo'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
import { computeCategoryQuickFilterOptions } from '@/lib/vehicle-category'
import { getAvailableRankings } from '@/lib/rankings'
import { getManufacturerMarqueeItems } from '@/lib/vehicle-manufacturers'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { Card } from '@/components/ui/Card'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { CategoryCardMedia } from '@/components/ui/CategoryCardMedia'
import { FinancingCalculator } from '@/components/ui/FinancingCalculator'
import { FinancingCalculatorSkeleton } from '@/components/ui/loading'
import { Reveal } from '@/components/ui/Reveal'
import { EntityCard } from '@/components/entities/EntityCard'
import { getCategoryPreviewImages } from '@/lib/images'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { CategoryQuickFilter } from '@/components/home/CategoryQuickFilter'
import { TiltCard } from '@/components/home/Parallax'
import { AdUnit } from '@/components/monetization/AdUnit'
import { CompareShowcase, type CompareShowcaseVehicle } from '@/components/home/CompareShowcase'
import { HeroCatalogIndex } from '@/components/home/HeroCatalogIndex'
import { EvidenceSpotlight, type EvidenceHighlight } from '@/components/home/EvidenceSpotlight'
import { RankingsSpotlight, type RankingSpotlight } from '@/components/home/RankingsSpotlight'
import { FeaturedCarousel } from '@/components/home/FeaturedCarousel'
import { HomeFaqPanel, type FaqItem } from '@/components/home/HomeFaqPanel'
import { formatRelativeTime } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata()
}

/**
 * ============================================================================
 * HOME — REDISEÑO RADICAL (sept. 2026, "cambio de 180°, no una iteración")
 * ============================================================================
 *
 * QUÉ HABÍA ANTES (ver CHANGELOG / git history de este archivo si hace
 * falta el detalle completo): un viewport pineado a 100dvh donde el
 * scroll pasaba de un panel al siguiente por crossfade (`PinnedScrollStages`),
 * sobre lienzo blanco, tipografía grande estilo Apple/Vercel, con el hero
 * ya convertido en el comparador en vivo (`CompareShowcase`) en vez de un
 * eyebrow+headline+CTA — un salto real en su momento, pero encerrado en
 * una envoltura visual (blanco, cards redondeadas, crossfade de panel
 * completo) que, tras 4-5 iteraciones previas, seguía leyéndose como
 * "otra landing SaaS prolija".
 *
 * QUÉ CAMBIA ACÁ (ruptura de composición + de sistema visual, no solo de
 * paleta):
 *
 * 1. Se elimina el viewport pineado. La home vuelve a ser un documento de
 *    scroll normal — como el resto del sitio — así que `TrendingBar` y
 *    `Footer` (antes ocultos en `/` vía `HideOnHome`, ver `layout.tsx`)
 *    vuelven a aparecer acá también. Esto también mata la necesidad del
 *    header "claro y flotante" exclusivo de home (`Header.tsx` ya no
 *    diferencia `/` del resto de las rutas).
 *
 * 2. Lienzo permanentemente oscuro ("dossier técnico"), independiente del
 *    toggle claro/oscuro del resto del sitio: se fuerza `.dark` sobre un
 *    contenedor propio (mismo patrón que ya usa `dashboard/page.tsx`),
 *    así que esta página reutiliza la escala de color oscura ya
 *    diseñada y auditada (`AUDITORIA-FONDO-OSCURO-COMPLETA.md`) sin
 *    inventar una paleta nueva ni tocar ningún token global — el resto
 *    del sitio sigue exactamente igual, con su propio toggle intacto.
 *
 * 3. Composición: nada de tarjetas centradas apiladas con el mismo
 *    patrón "eyebrow + H2 centrado + grid" repetido panel tras panel.
 *    Cada sección numerada (01, 02, 03…) como una hoja de un expediente,
 *    con el número como pieza tipográfica enorme (mono, solo contorno) en
 *    vez de un ícono o una card — asimetría real: número a la izquierda,
 *    contenido a la derecha en desktop (`.dossier-index`, ver
 *    globals.css), grillas de categorías/noticias con una pieza
 *    dominante en vez de todas del mismo tamaño.
 *
 * 4. El hero deja el centrado clásico: título editorial enorme,
 *    desalineado a la izquierda, con el comparador en vivo presentado
 *    como una "hoja de diagnóstico" con marcas de registro en las
 *    esquinas (`.dossier-corner`) en vez de una card blanca con sombra.
 *    Se conserva el PRINCIPIO del hero anterior (la primera acción es
 *    interactuar con datos reales, no leer una promesa) porque es un
 *    diferencial genuino del sitio — lo que cambia es la envoltura
 *    visual completa, no el concepto de producto.
 *
 * 5. Radios y sombras: `tailwind.config.js` cambia la escala completa de
 *    `borderRadius`/`boxShadow` (mismas claves, valores nuevos — casi sin
 *    curva, sombra dura con offset en vez de blur), así que TODA card del
 *    sitio (no solo home) hereda el giro "placa técnica" sin que haga
 *    falta tocar cada componente uno por uno.
 *
 * Los componentes de datos/interacción (CompareShowcase, RankingsSpotlight,
 * EvidenceSpotlight, FeaturedCarousel, CategoryQuickFilter,
 * ManufacturersMarquee, HomeFaqPanel, FinancingCalculator) NO cambian su
 * lógica ni sus props — solo cambia la envoltura/composición alrededor,
 * que es lo que se reescribe acá. `PinnedScrollStages.tsx`,
 * `HeroShowroom.tsx` y el resto de heroes legacy quedan sin uso en el
 * repo, sin borrar, por si se quiere retomar algo puntual más adelante.
 */

const CATEGORY_ORDER: EntityType[] = [EntityType.VEHICLE, EntityType.NEWS, EntityType.GUIDE]
const CATEGORY_ACCENT: Record<EntityType, string> = {
  [EntityType.VEHICLE]: '#c9a35f',
  [EntityType.NEWS]: '#ff6a1a',
  [EntityType.GUIDE]: '#3d84ff',
  [EntityType.MANUFACTURER]: '#8a8f98',
}

/** Mínimo de vehículos `featured` con imagen resuelta que necesita el
 *  panel "Comparador en vivo" del hero para tener sentido (necesita un
 *  lado A y un lado B) — por debajo de este umbral, el hero cae a un CTA
 *  mínimo en vez de montar `CompareShowcase` con un pool insuficiente. */
const MIN_COMPARE_SHOWCASE_POOL = 2

/** Cuántas fichas con fuente citada entran en "Un dato, una fuente" —
 *  grid de 3 columnas en desktop, múltiplo de 3 para que corte prolijo
 *  tanto en 1 fila (mobile) como en 2 (desktop). */
const HOME_EVIDENCE_HIGHLIGHTS_LIMIT = 6

/** Posiciones de cada ranking que entran en el mini-leaderboard del
 *  panel "Rankings" (el ranking completo vive en `/rankings/[slug]`). */
const HOME_RANKING_TOP_ENTRIES = 3

/** Prioridad de nivel de evidencia para elegir qué fichas destacar en
 *  "Un dato, una fuente" (mismo orden que `EVIDENCE_STAMP_META`). */
const EVIDENCE_LEVEL_PRIORITY: Record<EvidenceLevel, number> = {
  'oficial-nombrado': 0,
  'oficial-visual-multifuente': 1,
  'oficial-visual': 2,
  respaldado: 3,
  especulativo: 4,
}

function FinancingCalculatorFallback() {
  return <FinancingCalculatorSkeleton />
}

/**
 * Cabecera de sección numerada ("hoja de expediente"): número mono
 * hueco a la izquierda (sticky en desktop), etiqueta + título a la
 * derecha. Reemplaza el patrón repetido "eyebrow centrado + H2 centrado"
 * que tenía cada panel del track anterior — acá cada sección arranca
 * con la misma anatomía pero NUNCA centrada, para que el scroll normal
 * se sienta como avanzar páginas de un mismo documento, no como pasar
 * de una landing-block a la siguiente.
 */
function DossierSectionHeading({
  index,
  tag,
  title,
  lede,
  action,
}: {
  index: string
  tag: string
  title: string
  lede?: ReactNode
  action?: { href: string; label: string }
}) {
  return (
    <div className="mb-10 grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10 xl:grid-cols-[9rem_1fr]">
      <Reveal direction="left">
        <span aria-hidden="true" className="dossier-index block">
          {index}
        </span>
      </Reveal>
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="dossier-tag mb-3 text-neutral-500">{tag}</p>
          <h2 className="max-w-2xl font-display text-3xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {lede && <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">{lede}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="link-underline hidden shrink-0 text-sm font-semibold text-neutral-500 hover:text-neutral-900 sm:inline-block"
          >
            {action.label} →
          </Link>
        )}
      </Reveal>
    </div>
  )
}

/** Las 4 marcas de registro/crop-mark de una esquina — ver `.dossier-corner`
 *  en globals.css. El contenedor que las use debe ser `relative`. */
function DossierCorners() {
  return (
    <>
      <span aria-hidden="true" className="dossier-corner" data-corner="tl" />
      <span aria-hidden="true" className="dossier-corner" data-corner="tr" />
      <span aria-hidden="true" className="dossier-corner" data-corner="bl" />
      <span aria-hidden="true" className="dossier-corner" data-corner="br" />
    </>
  )
}

export default async function HomePage() {
  const [featured, totalCount, countsByType, allNews, allVehicles, availableRankings, manufacturerMarqueeItems] =
    await Promise.all([
      getFeaturedEntities(12, EntityType.VEHICLE),
      getEntityCount(),
      getEntityCountsByType(),
      getEntitiesByType(EntityType.NEWS),
      getEntitiesByType(EntityType.VEHICLE),
      getAvailableRankings(),
      getManufacturerMarqueeItems(),
    ])
  const vehicles = allVehicles as Vehicle[]

  const categoryQuickFilterOptions = computeCategoryQuickFilterOptions(vehicles)

  const latestNews = [...allNews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
  const latestNewsImages = Object.fromEntries(
    latestNews.map((entity) => [entity.slug, resolveEntityDisplayImage(entity)])
  )
  const latestNewsDates = Object.fromEntries(
    latestNews.map((entity) => [entity.slug, formatRelativeTime(entity.createdAt)])
  )

  const breadcrumbLd = generateBreadcrumbJsonLd([{ label: 'Inicio', url: '/' }])
  const websiteLd = generateWebsiteJsonLd()

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

  // % con fuente citada sobre TODO el catálogo indexable (vehículos +
  // noticias) — no solo sobre los destacados. Usado por el hero como
  // trust signal real (ver `evidenceHighlights` arriba para el mismo
  // criterio de "tiene primarySource").
  const evidenceEligibleEntities = [...vehicles, ...allNews]
  const evidenceCoveredCount = evidenceEligibleEntities.filter((entity) =>
    Boolean(entity.evidence?.primarySource)
  ).length
  const evidenceCoveragePct =
    evidenceEligibleEntities.length > 0
      ? Math.round((evidenceCoveredCount / evidenceEligibleEntities.length) * 100)
      : null

  // Cifras reales por categoría para el anticipo compacto del hero (una
  // línea de números, no la grilla completa — esa vive en "01. Categorías").
  const heroCategoryCounts = categories.map((type) => ({ type, count: countsByType[type] }))

  // Muestra real de títulos del catálogo para el placeholder rotativo de
  // la búsqueda del hero — nunca marcas inventadas. Si el catálogo es muy
  // chico, se deja sin pasar la prop y `QuickSearchForm` usa su propio
  // fallback fijo.
  const HERO_SEARCH_EXAMPLES_COUNT = 6
  const heroSearchExamplesCount = Math.min(HERO_SEARCH_EXAMPLES_COUNT, vehicles.length)
  const heroSearchExamples =
    heroSearchExamplesCount > 1
      ? Array.from(new Set(
          Array.from({ length: heroSearchExamplesCount }, (_, i) => {
            const vehicle = vehicles[Math.floor((i * vehicles.length) / heroSearchExamplesCount)]
            return vehicle?.title
          }).filter((title): title is string => Boolean(title))
        ))
      : undefined

  const rankingsSpotlightData: RankingSpotlight[] = availableRankings.map((ranking) => ({
    slug: ranking.def.slug,
    shortTitle: ranking.def.shortTitle,
    title: ranking.def.title,
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />

      {/* `dossier dark`: lienzo oscuro forzado, independiente del toggle
          claro/oscuro global — ver comentario largo arriba y
          globals.css §"Home: dossier técnico". */}
      <div className="dossier dark bg-surface-page text-neutral-900">
        {/* ================= HERO — GIRO DE 180° (ver HERO_HOME_180_REDESIGN_REPORT.txt) =================
            Antes: hero = headline abstracto + comparador de 2 autos como
            primera interacción. Ahora: hero = búsqueda real como acción
            principal + prueba concreta de la profundidad del catálogo
            (cifras reales + marcas reales). El comparador en vivo no se
            eliminó — pasa a la sección "00" inmediatamente debajo, deja de
            SER el hero pero sigue siendo de lo primero que se ve. */}
        <HeroCatalogIndex
          siteName={SITE_NAME}
          totalCount={totalCount}
          evidenceCoveragePct={evidenceCoveragePct}
          categories={heroCategoryCounts}
          manufacturers={manufacturerMarqueeItems}
          searchExamples={heroSearchExamples}
          catalogHref={`/${EntityType.VEHICLE}`}
        />

        {/* ================= 00 — COMPARADOR EN VIVO ================= */}
        <section id="comparador" className="border-b border-edge py-16 sm:py-20">
          <div className="container-max">
            <DossierSectionHeading
              index="00"
              tag="Comparador"
              title="Elegí dos, mirá la diferencia"
              lede="Potencia, precio y evidencia citada lado a lado — sin abrir dos pestañas."
            />
            <div className="relative border border-edge bg-surface-card/60 p-5 sm:p-8 lg:p-12">
              <DossierCorners />
              {compareShowcasePool.length >= MIN_COMPARE_SHOWCASE_POOL ? (
                <>
                  <CompareShowcase
                    pool={compareShowcasePool}
                    initialIndexA={compareInitialIndexA}
                    initialIndexB={compareInitialIndexB}
                  />
                  <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                    <Link
                      href="/comparar"
                      className="cta-shine tap-scale group inline-flex items-center justify-center gap-2 rounded-full bg-inverse px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                    >
                      Abrir el comparador completo{' '}
                      <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
                        →
                      </span>
                    </Link>
                    <Link
                      href={`/${EntityType.VEHICLE}`}
                      className="tap-scale text-sm font-semibold text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
                    >
                      Ver todo el catálogo
                    </Link>
                  </div>
                </>
              ) : (
                <div className="mx-auto w-full max-w-2xl py-6 text-center">
                  <p className="mb-6 font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                    {SITE_NAME}
                  </p>
                  <Link
                    href={`/${EntityType.VEHICLE}`}
                    className="cta-shine tap-scale inline-flex items-center justify-center rounded-full bg-inverse px-8 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5"
                  >
                    Ver el catálogo
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= 01 — CATEGORÍAS ================= */}
        <section id="categorias" className="border-b border-edge py-20 sm:py-28">
          <div className="container-max">
            <DossierSectionHeading
              index="01"
              tag="Categorías"
              title="Explorá por sección"
              action={{ href: '/buscar', label: `Ver las ${totalCount} entradas` }}
            />

            {/* Grid asimétrico: la primera categoría ocupa el doble de
                columnas en desktop (pieza dominante) en vez de una
                grilla uniforme de tarjetas idénticas. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((type, i) => {
                const density = Math.max(6, Math.round((countsByType[type] / maxCategoryCount) * 100))
                const accent = CATEGORY_ACCENT[type]
                return (
                  <Reveal key={type} delay={i * 70} className={i === 0 ? 'lg:col-span-2' : undefined}>
                    <Link href={`/${type}`} className="group block h-full">
                      <TiltCard className="h-full">
                        <Card hoverable className="relative flex h-full flex-col overflow-hidden !p-0 text-left">
                          <div className={`relative w-full shrink-0 overflow-hidden ${i === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
                            <CategoryCardMedia previews={categoryPreviews[type]} />
                            <div className="absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur">
                              <CategoryIcon type={type} className="h-5 w-5" />
                            </div>
                          </div>
                          <div className="relative z-10 flex flex-1 flex-col gap-2 px-5 py-4">
                            <p className="font-display text-lg font-semibold text-neutral-900">{ENTITY_TYPE_LABELS[type]}</p>
                            <p className="dossier-tag text-neutral-500">
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

            <Reveal delay={220}>
              <CategoryQuickFilter options={categoryQuickFilterOptions} />
            </Reveal>
          </div>
        </section>

        {/* ================= 02 — DESTACADOS ================= */}
        {featured.length > 0 && (
          <section id="destacados" className="border-b border-edge py-20 sm:py-28">
            <div className="container-max">
              <DossierSectionHeading
                index="02"
                tag="Destacados"
                title="Lo más relevante del catálogo"
                action={{ href: '/galeria', label: 'Ver galería completa' }}
              />
              <FeaturedCarousel ariaLabel="Vehículos destacados">
                {featured.map((entity, i) => (
                  <div
                    key={`${entity.type}-${entity.slug}`}
                    className="w-[44%] shrink-0 snap-start snap-stop-always sm:w-[30%] lg:w-[22%]"
                  >
                    <Reveal delay={i * 50}>
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
          </section>
        )}

        {/* ================= 03 — EVIDENCIA ================= */}
        {evidenceHighlights.length > 0 && (
          <section id="evidencia" className="border-b border-edge py-20 sm:py-28">
            <div className="container-max grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10 xl:grid-cols-[9rem_1fr]">
              <Reveal direction="left">
                <span aria-hidden="true" className="dossier-index block">
                  03
                </span>
              </Reveal>
              <EvidenceSpotlight highlights={evidenceHighlights} />
            </div>
          </section>
        )}

        {/* ================= 04 — RANKINGS ================= */}
        {rankingsSpotlightData.length > 0 && (
          <section id="rankings" className="border-b border-edge py-20 sm:py-28">
            <div className="container-max grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10 xl:grid-cols-[9rem_1fr]">
              <Reveal direction="left">
                <span aria-hidden="true" className="dossier-index block">
                  04
                </span>
              </Reveal>
              <RankingsSpotlight rankings={rankingsSpotlightData} />
            </div>
          </section>
        )}

        {/* ================= 05 — NOTICIAS ================= */}
        {latestNews.length > 0 && (
          <section id="noticias" className="border-b border-edge py-20 sm:py-28">
            <div className="container-max">
              <DossierSectionHeading
                index="05"
                tag="Últimas noticias"
                title="Novedades del sector"
                action={{ href: '/noticias', label: 'Ver todas' }}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {latestNews.map((entity, i) => (
                  <Reveal key={`${entity.type}-${entity.slug}`} delay={i * 70}>
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

              <AdUnit
                slotId="3119092668"
                format="responsive"
                className="mt-10"
                dataTrackingLabel="ad-home-noticias"
              />
            </div>
          </section>
        )}

        {/* ================= 06 — FINANCIAMIENTO ================= */}
        <section id="financiamiento" className="border-b border-edge py-20 sm:py-28">
          <div className="container-max">
            <DossierSectionHeading
              index="06"
              tag="Financiamiento"
              title="Simulá tu cuota"
              lede={
                <>
                  Precio, entrega, tasa y plazo — la misma calculadora de <code className="font-mono text-neutral-400">/financiamiento</code>,
                  acá mismo.
                </>
              }
            />
            <Reveal className="max-w-xl">
              <Suspense fallback={<FinancingCalculatorFallback />}>
                <FinancingCalculator />
              </Suspense>
            </Reveal>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <HomeFaqPanel items={faqItems} />

        {/* ================= CIERRE ================= */}
        <section className="dossier-grid border-b border-edge py-20 sm:py-28">
          <div className="container-max">
            <div className="relative mx-auto max-w-3xl border border-edge bg-surface-card/40 px-6 py-12 text-center sm:px-12">
              <DossierCorners />
              <Reveal>
                <p className="dossier-tag mb-3 text-auto-accent">Fin del expediente</p>
                <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                  Ya tenés con qué decidir
                </h2>
                <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-500 sm:text-base">
                  Evidencia citada, rankings reales y tu cuota simulada — no hace falta buscar en otro lado.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/vehiculos"
                    className="cta-shine tap-scale group inline-flex items-center justify-center gap-2 rounded-full bg-inverse px-8 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5"
                  >
                    Elegí tu vehículo{' '}
                    <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                  <Link
                    href="/buscar"
                    className="tap-scale inline-flex items-center justify-center rounded-full border border-neutral-300 px-8 py-4 font-semibold text-neutral-900 transition-transform hover:-translate-y-0.5"
                  >
                    Buscar un modelo puntual
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
