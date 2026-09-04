import Link from 'next/link'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { computeSeoCategoryOptions, categoryToSlug } from '@/lib/vehicle-category'
import { generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo'
import { Reveal } from '@/components/ui/Reveal'
import { Card, CardBody } from '@/components/ui/Card'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { AdUnit } from '@/components/monetization/AdUnit'
import { SITE_NAME, SITE_URL } from '@/config/site'

const TITLE = `Categorías de vehículos | ${SITE_NAME}`
const DESCRIPTION =
  'Explorá el catálogo de Sin Frenos agrupado por categoría — SUV, Sedán, Hatchback, Pickup, Deportivo y más — con ficha técnica completa y fuente citada en cada dato.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/categorias` },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/categorias`,
    siteName: SITE_NAME,
  },
}

/**
 * Índice de `/categorias` (FASE 6, Gap 1). Hasta ahora solo existía
 * `/categorias/[grupo]`: estas páginas no tenían ningún hub que las
 * listara ni ningún link interno apuntándoles (quedaban huérfanas,
 * descubribles solo vía sitemap). Mismo patrón que `/rankings` (índice
 * equivalente para esa otra feature): lista únicamente las categorías
 * que superan el umbral de contenido y no son 'Otros'
 * (`computeSeoCategoryOptions` ya aplica ese filtro — única fuente de
 * verdad compartida con `generateStaticParams` de `/categorias/[grupo]`
 * y con `sitemap.ts`), así que esta página nunca enlaza a una ruta que
 * respondería 404.
 */
export default async function CategoriasIndexPage() {
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const categories = computeSeoCategoryOptions(vehicles)

  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: 'Categorías', url: '/categorias' },
  ])

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
            <span className="text-neutral-900">Categorías</span>
          </nav>

          <h1 className="text-4xl font-bold text-neutral-900">Categorías de vehículos</h1>
          <p className="mt-3 max-w-2xl text-neutral-500">
            El catálogo agrupado por categoría amplia — cada una con ficha técnica completa,
            evidencia citada y comparador. Solo se listan categorías con suficientes vehículos
            documentados como para ser una página real, no una lista vacía.
          </p>
        </Reveal>

        {categories.length === 0 ? (
          <p className="text-neutral-500">
            Todavía no hay categorías publicadas: el catálogo no alcanza el mínimo de vehículos
            comparables para ninguna categoría.
          </p>
        ) : (
          <Reveal className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ group, count }) => (
              <Link key={group} href={`/categorias/${categoryToSlug(group)}`} className="group">
                <Card hoverable className="h-full transition-colors duration-300 hover:border-auto-accent/60">
                  <CardBody className="flex h-full flex-col gap-2">
                    <div className="category-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-auto-accent">
                      <CategoryIcon type={EntityType.VEHICLE} className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-900">{group}</h2>
                    <p className="flex-1 text-sm text-neutral-500">
                      {count} {group.toLowerCase()}s documentados.
                    </p>
                    <span className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-auto-accent">
                      Ver categoría
                      <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </Reveal>
        )}

        {/* Monetization: mismo slot real de AdSense reusado en el resto
            del sitio (ver rankings/page.tsx para el mismo criterio). */}
        <Reveal className="mt-12">
          <AdUnit slotId="3119092668" format="responsive" dataTrackingLabel="ad-categorias-index" />
        </Reveal>
      </div>
    </section>
  )
}
