import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getEntityImageMap } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { getVehiclesByManufacturer } from '@/lib/vehicle-manufacturers'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityCard } from '@/components/entities/EntityCard'
import { SITE_NAME, SITE_URL } from '@/config/site'

interface PageProps {
  params: Promise<{ manufacturer: string }>
}

/**
 * Página de agregación por fabricante ("todos los vehículos Vapid",
 * "todos los vehículos Bravado"). Roadmap punto 4 del audit: el dato ya
 * existe en cada ficha de vehículo (`manufacturer`), así que esta página
 * no agrega contenido editorial nuevo — solo expone una vista ya
 * soportada por el modelo de datos, útil tanto para navegación como para
 * SEO de cola larga ("fichas técnicas Toyota").
 */

export async function generateStaticParams() {
  const map = await getVehiclesByManufacturer()
  return Array.from(map.keys()).map((manufacturer) => ({ manufacturer }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { manufacturer } = await params
  const map = await getVehiclesByManufacturer()
  const entry = map.get(manufacturer)
  if (!entry) return {}

  const title = `Vehículos ${entry.label} — ${SITE_NAME}`
  const description = `Explorá los ${entry.vehicles.length} vehículos de ${entry.label} documentados, con fuente y ficha técnica por unidad.`
  const url = `${SITE_URL}/vehiculos/fabricante/${manufacturer}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
    },
  }
}

export default async function ManufacturerHubPage({ params }: PageProps) {
  const { manufacturer } = await params
  const map = await getVehiclesByManufacturer()
  const entry = map.get(manufacturer)
  if (!entry) notFound()

  const { label, vehicles } = entry

  const relationCountEntries = await Promise.all(
    vehicles.map(async (v) => [v.slug, await getBidirectionalRelationCount(v)] as const)
  )
  const relationCountBySlug = Object.fromEntries(relationCountEntries)
  const imageBySlug = getEntityImageMap(vehicles)

  const statusCounts = { confirmado: 0, rumor: 0, nuestro: 0 } as Record<
    'confirmado' | 'rumor' | 'nuestro',
    number
  >
  for (const v of vehicles) {
    const key = v.status as keyof typeof statusCounts
    if (key in statusCounts) statusCounts[key] += 1
  }

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
            <Link href="/vehiculos" className="link-underline transition-colors hover:text-auto-accent">
              Vehículos
            </Link>
            <span className="mx-2">/</span>
            <span className="text-auto-text">{label}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="category-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-auto-accent">
              <CategoryIcon type={EntityType.VEHICLE} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-auto-text">Vehículos {label}</h1>
              <p className="mt-1 text-auto-text-secondary">
                {vehicles.length} {vehicles.length === 1 ? 'vehículo documentado' : 'vehículos documentados'}
                {vehicles.length > 0 && (
                  <span className="text-auto-text-secondary/80">
                    {' · '}
                    {[
                      statusCounts.confirmado > 0 && `${statusCounts.confirmado} confirmado${statusCounts.confirmado === 1 ? '' : 's'}`,
                      statusCounts.rumor > 0 && `${statusCounts.rumor} rumor${statusCounts.rumor === 1 ? '' : 'es'}`,
                      statusCounts.nuestro > 0 && `${statusCounts.nuestro} propio${statusCounts.nuestro === 1 ? '' : 's'}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="stagger grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {vehicles.map((vehicle) => (
            <EntityCard
              key={vehicle.slug}
              entity={vehicle}
              image={imageBySlug[vehicle.slug]}
              typeLabel="Vehículo"
              relationCount={relationCountBySlug[vehicle.slug]}
            />
          ))}
        </Reveal>
      </div>
    </section>
  )
}
