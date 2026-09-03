import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAvailableRankings, getRankingBySlug } from '@/lib/rankings'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { getEntityImageMap } from '@/lib/media'
import { generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo'
import { Reveal } from '@/components/ui/Reveal'
import { EntityCard } from '@/components/entities/EntityCard'
import { AdUnit } from '@/components/monetization/AdUnit'
import { SITE_NAME, SITE_URL } from '@/config/site'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * PASO 12/16: solo se generan (y se anuncian en sitemap.ts) las rutas que
 * realmente superan el umbral de contenido — mismo criterio que usa
 * `getAvailableRankings` para el índice, así que un ranking nunca aparece
 * listado sin que su página exista, ni al revés.
 */
export async function generateStaticParams() {
  const rankings = await getAvailableRankings()
  return rankings.map((r) => ({ slug: r.def.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const ranking = await getRankingBySlug(slug)
  if (!ranking) return {}

  const title = `${ranking.def.title} | ${SITE_NAME}`
  const url = `${SITE_URL}/rankings/${slug}`

  return {
    title,
    description: ranking.def.metaDescription,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description: ranking.def.metaDescription,
      url,
      siteName: SITE_NAME,
    },
  }
}

export default async function RankingDetailPage({ params }: PageProps) {
  const { slug } = await params
  const ranking = await getRankingBySlug(slug)
  if (!ranking) notFound()

  const vehicles = ranking.entries.map((e) => e.vehicle)
  const relationCountEntries = await Promise.all(
    vehicles.map(async (v) => [v.slug, await getBidirectionalRelationCount(v)] as const)
  )
  const relationCountBySlug = Object.fromEntries(relationCountEntries)
  const imageBySlug = getEntityImageMap(vehicles)

  const url = `${SITE_URL}/rankings/${slug}`

  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: 'Rankings', url: '/rankings' },
    { label: ranking.def.shortTitle, url: `/rankings/${slug}` },
  ])

  /**
   * PASO 15: ItemList de schema.org. Posiciones y URLs corresponden
   * exactamente al orden y a las entidades reales calculadas arriba —
   * nunca se inventan posiciones ni se listan entidades fuera del top
   * mostrado en la página.
   */
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: ranking.def.title,
    description: ranking.def.metaDescription,
    url,
    numberOfItems: ranking.entries.length,
    itemListElement: ranking.entries.map((entry) => ({
      '@type': 'ListItem',
      position: entry.position,
      url: `${SITE_URL}/${entry.vehicle.type}/${entry.vehicle.slug}`,
      name: entry.vehicle.title,
    })),
  }

  return (
    <section className="relative overflow-hidden border-b border-edge py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListLd) }} />
      <div className="list-header-glow" aria-hidden="true" />
      <div className="container-max relative">
        <Reveal className="mb-10">
          <nav className="mb-4 text-sm text-neutral-500" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <Link href="/rankings" className="link-underline transition-colors hover:text-auto-accent">
              Rankings
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-900">{ranking.def.shortTitle}</span>
          </nav>

          <h1 className="text-4xl font-bold text-neutral-900">{ranking.def.title}</h1>
          <p className="mt-3 max-w-3xl text-neutral-500">{ranking.def.intro}</p>
          <p className="mt-2 text-sm text-neutral-400">
            Criterio: {ranking.def.criterionLabel}. Mostrando {ranking.entries.length} de{' '}
            {ranking.eligibleCount} vehículos con dato comparable
            {ranking.excludedCount > 0
              ? ` (${ranking.excludedCount} vehículos del catálogo no tienen este dato cargado o no son comparables y no participan de este ranking, sin ser excluidos del resto del sitio)`
              : ''}
            .
          </p>
        </Reveal>

        <Reveal className="stagger grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {ranking.entries.map((entry) => (
            <EntityCard
              key={entry.vehicle.slug}
              entity={entry.vehicle}
              image={imageBySlug[`${entry.vehicle.type}/${entry.vehicle.slug}`]}
              typeLabel="Vehículo"
              relationCount={relationCountBySlug[entry.vehicle.slug]}
              rankBadge={{ position: entry.position, metricLabel: entry.metricLabel }}
            />
          ))}
        </Reveal>

        {/* Auditoría de monetización (2026-09): rankings individuales
            (ej. /rankings/autos-mas-potentes) sin AdUnit — mismo slot
            responsive reutilizado que el índice de /rankings. */}
        <AdUnit slotId="3119092668" format="responsive" className="mt-12" dataTrackingLabel={`ad-ranking-${slug}`} />
      </div>
    </section>
  )
}
