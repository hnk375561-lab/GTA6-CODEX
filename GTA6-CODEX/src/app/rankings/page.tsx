import Link from 'next/link'
import type { Metadata } from 'next'
import { getAvailableRankings } from '@/lib/rankings'
import { getMostRecentUpdate } from '@/lib/entities'
import { generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo'
import { Reveal } from '@/components/ui/Reveal'
import { Card, CardBody } from '@/components/ui/Card'
import { SITE_NAME, SITE_URL } from '@/config/site'

const TITLE = `Rankings de vehículos | ${SITE_NAME}`
const DESCRIPTION =
  'Rankings automáticos de vehículos calculados a partir de datos reales del catálogo: potencia, precio y año de lanzamiento. Sin opiniones ni datos inventados.'

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

  return (
    <section className="relative overflow-hidden border-b border-auto-border py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      <div className="list-header-glow" aria-hidden="true" />
      <div className="container-max relative">
        <Reveal className="mb-10">
          <nav className="mb-4 text-sm text-auto-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-auto-text">Rankings</span>
          </nav>

          <h1 className="text-4xl font-bold text-auto-text">Rankings de vehículos</h1>
          <p className="mt-3 max-w-2xl text-auto-text-secondary">
            Rankings calculados automáticamente a partir de los datos reales del catálogo — sin
            opiniones, sin ratings inventados. Cada ranking indica exactamente qué campo y qué
            criterio usa para ordenar.
            {lastUpdateLabel && ` Catálogo actualizado por última vez el ${lastUpdateLabel}.`}
          </p>
        </Reveal>

        {rankings.length === 0 ? (
          <p className="text-auto-text-secondary">
            Todavía no hay rankings publicados: el catálogo no alcanza el mínimo de vehículos
            comparables para ninguno de los criterios definidos.
          </p>
        ) : (
          <Reveal className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rankings.map((ranking) => (
              <Link key={ranking.def.slug} href={`/rankings/${ranking.def.slug}`}>
                <Card hoverable className="h-full transition-colors duration-300 hover:border-auto-accent/60">
                  <CardBody className="flex h-full flex-col gap-2">
                    <h2 className="text-xl font-bold text-auto-text">{ranking.def.shortTitle}</h2>
                    <p className="flex-1 text-sm text-auto-text-secondary">
                      Top {ranking.entries.length} de {ranking.eligibleCount} vehículos comparables,
                      ordenados por {ranking.def.criterionLabel}.
                    </p>
                    <span className="text-sm font-semibold uppercase tracking-wide text-auto-accent">
                      Ver ranking →
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  )
}
