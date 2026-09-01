import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityCard } from '@/components/entities/EntityCard'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { AdUnit } from '@/components/monetization/AdUnit'

const TITLE = `Fabricantes | ${SITE_NAME}`
const DESCRIPTION = `Explorá los 75 fabricantes de vehículos y motos documentados, con historia, origen y catálogo de modelos.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/fabricantes` },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/fabricantes`,
    siteName: SITE_NAME,
  },
}

export default async function ManufacturersHubPage() {
  const manufacturers = await getEntitiesByType(EntityType.MANUFACTURER)

  if (manufacturers.length === 0) {
    notFound()
  }

  const relationCountEntries = await Promise.all(
    manufacturers.map(async (m) => [m.slug, await getBidirectionalRelationCount(m)] as const)
  )
  const relationCountBySlug = Object.fromEntries(relationCountEntries)
  const imageBySlug = getEntityImageMap(manufacturers)

  return (
    <section className="relative overflow-hidden border-b border-auto-border py-12 sm:py-16">
      <div className="list-header-glow" aria-hidden="true" />
      <div className="container-max relative">
        <Reveal className="mb-10">
          <nav className="mb-4 text-sm text-auto-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-auto-text">Fabricantes</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="category-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-auto-accent">
              <CategoryIcon type={EntityType.MANUFACTURER} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-auto-text">Fabricantes documentados</h1>
              <p className="mt-1 text-auto-text-secondary">
                {manufacturers.length} fabricantes de vehículos y motos con historia y catálogo completo.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Monetization: Ad Unit */}
        <Reveal className="mb-10">
          <AdUnit slotId="2894897236" format="horizontal" dataTrackingLabel="ad-fabricantes" />
        </Reveal>

        <Reveal className="stagger grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {manufacturers.map((manufacturer) => (
            <EntityCard
              key={manufacturer.slug}
              entity={manufacturer}
              image={imageBySlug[`${manufacturer.type}/${manufacturer.slug}`]}
              typeLabel="Fabricante"
              relationCount={relationCountBySlug[manufacturer.slug]}
            />
          ))}
        </Reveal>
      </div>
    </section>
  )
}
