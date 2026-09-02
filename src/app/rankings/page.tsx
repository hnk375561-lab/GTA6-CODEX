import Link from 'next/link'
import type { Metadata } from 'next'
import { getAvailableRankings } from '@/lib/rankings'
import { getMostRecentUpdate } from '@/lib/entities'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { getEntityImageMap } from '@/lib/media'
import { generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo'
import { Reveal } from '@/components/ui/Reveal'
import { RankingsLeaderboardTabs, type RankingTabData } from '@/components/rankings/RankingsLeaderboardTabs'
import { SITE_NAME, SITE_URL } from '@/config/site'

const TITLE = `Rankings de vehículos | ${SITE_NAME}`
const DESCRIPTION =
  'Rankings automáticos de vehículos calculados a partir de datos reales del catálogo: potencia, precio y año de lanzamiento. Sin opiniones ni datos inventados.'

/** Cuántas posiciones se muestran en el preview con tabs del índice —
 *  a diferencia de `RANKING_TOP_N` (usado en `/rankings/[slug]`), acá es
 *  deliberadamente chico: es un adelanto navegable, no un reemplazo de la
 *  página completa (que sigue siendo el link "Ver ranking completo"). */
const RANKING_PREVIEW_COUNT = 10

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/rankings` },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/rankings`,
    siteName: SITE_NAME,
  },
}

/**
 * Índice de `/rankings` (PASO 12). Lista únicamente los rankings que
 * superaron el umbral de contenido (`getAvailableRankings` ya filtra por
 * `isRankingEligible`) — nunca enlaza a una ruta que no vaya a existir.
 */
export default async function RankingsIndexPage() {
  const [rankings, lastUpdate] = await Promise.all([getAvailableRankings(), getMostRecentUpdate()])

  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: 'Rankings', url: '/rankings' },
  ])

  const lastUpdateLabel = lastUpdate
    ? new Date(lastUpdate).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  // Preview con tabs (Prioridad C): solo necesita imagen + conteo de
  // relaciones de los vehículos que realmente entran en el preview
  // (`RANKING_PREVIEW_COUNT` por ranking), no de los hasta `RANKING_TOP_N`
  // de cada ranking completo — mismo patrón que `/rankings/[slug]`, pero
  // acotado para no resolver imágenes/relaciones de vehículos que el
  // preview nunca muestra.
  const previewVehicles = rankings.flatMap((r) => r.entries.slice(0, RANKING_PREVIEW_COUNT).map((e) => e.vehicle))
  const uniquePreviewVehicles = Array.from(new Map(previewVehicles.map((v) => [v.slug, v])).values())
  const relationCountEntries = await Promise.all(
    uniquePreviewVehicles.map(async (v) => [v.slug, await getBidirectionalRelationCount(v)] as const)
  )
  const relationCountBySlug = Object.fromEntries(relationCountEntries)
  const imageBySlug = getEntityImageMap(uniquePreviewVehicles)

  const tabsData: RankingTabData[] = rankings.map((r) => ({
    slug: r.def.slug,
    shortTitle: r.def.shortTitle,
    criterionLabel: r.def.criterionLabel,
    eligibleCount: r.eligibleCount,
    entries: r.entries.map((e) => ({
      vehicle: e.vehicle,
      position: e.position,
      metricLabel: e.metricLabel,
    })),
  }))

  return (
    <section className="relative overflow-hidden border-b border-edge py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      <div className="list-header-glow" aria-hidden="true" />
      <div className="container-max relative">
        <Reveal className="mb-10">
          <nav className="mb-4 text-sm text-neutral-500" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-900">Rankings</span>
          </nav>

          <h1 className="text-4xl font-bold text-neutral-900">Rankings de vehículos</h1>
          <p className="mt-3 max-w-2xl text-neutral-500">
            Rankings calculados automáticamente a partir de los datos reales del catálogo — sin
            opiniones, sin ratings inventados. Cada ranking indica exactamente qué campo y qué
            criterio usa para ordenar.
            {lastUpdateLabel && ` Catálogo actualizado por última vez el ${lastUpdateLabel}.`}
          </p>
        </Reveal>

        {rankings.length === 0 ? (
          <p className="text-neutral-500">
            Todavía no hay rankings publicados: el catálogo no alcanza el mínimo de vehículos
            comparables para ninguno de los criterios definidos.
          </p>
        ) : (
          <Reveal>
            <RankingsLeaderboardTabs
              rankings={tabsData}
              imageBySlug={imageBySlug}
              relationCountBySlug={relationCountBySlug}
              previewCount={RANKING_PREVIEW_COUNT}
            />
          </Reveal>
        )}
      </div>
    </section>
  )
}
