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

async function loadManufacturers() {
  return getEntitiesByType(EntityType.MANUFACTURER)
}

// Metadata dinámica a partir del conteo real (antes el "75" estaba
// hardcodeado en la descripción y se desincronizaba al agregar un
// fabricante). El cuerpo de la página usaba manufacturers.length; ahora
// generateMetadata y el render comparten la misma fuente.
export async function generateMetadata(): Promise<Metadata> {
  const manufacturers = await loadManufacturers()

  return {
    title: `Fabricantes | ${SITE_NAME}`,
    description: `Explorá los ${manufacturers.length} fabricantes de vehículos y motos documentados, con historia, origen y catálogo de modelos.`,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: `${SITE_URL}/fabricantes` },
    openGraph: {
      type: 'website',
      title: `Fabricantes | ${SITE_NAME}`,
      description: `Explorá los ${manufacturers.length} fabricantes de vehículos y motos documentados, con historia, origen y catálogo de modelos.`,
      url: `${SITE_URL}/fabricantes`,
      siteName: SITE_NAME,
    },
  }
}

export default async function ManufacturersHubPage() {
  const manufacturers = await loadManufacturers()

  if (manufacturers.length === 0) {
    notFound()
  }

  const relationCountEntries = await Promise.all(
    manufacturers.map(async (m) => [m.slug, await getBidirectionalRelationCount(m)] as const)
  )
  const relationCountBySlug = Object.fromEntries(relationCountEntries)
  const imageBySlug = getEntityImageMap(manufacturers)

  return (
    <section className="relative overflow-hidden border-b border-edge py-12 sm:py-16">
      <div className="list-header-glow" aria-hidden="true" />
      <div className="container-max relative">
        <Reveal className="mb-10">
          <nav className="mb-4 text-sm text-neutral-500" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-900">Fabricantes</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="category-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-auto-accent">
              <CategoryIcon type={EntityType.MANUFACTURER} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-neutral-900">Fabricantes documentados</h1>
              <p className="mt-1 text-neutral-500">
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
