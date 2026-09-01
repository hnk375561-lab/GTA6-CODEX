import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { parsePowerHp } from '@/lib/vehicle-power'
import {
  computeSeoCategoryOptions,
  getVehicleCategory,
  categoryToSlug,
  categoryFromSlug,
  MIN_VEHICLES_PER_SEO_CATEGORY,
  type VehicleCategory,
} from '@/lib/vehicle-category'
import { generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityCard } from '@/components/entities/EntityCard'
import { SITE_NAME, SITE_URL } from '@/config/site'

/**
 * Umbral mínimo para que una categoría amplia tenga página SEO propia.
 * Mismo criterio que el resto del sitio (`MIN_ATTRIBUTE_COUNT` en
 * entity-list-filters.ts): menos de esto y la página sería thin content,
 * exactamente el error que la Fase 19 del audit ("DO NOT BUILD YET")
 * pide evitar. Ver `MIN_VEHICLES_PER_SEO_CATEGORY` en vehicle-category.ts
 * — se comparte con el sitemap para que ambos coincidan siempre.
 */
const MIN_VEHICLES_PER_GROUP = MIN_VEHICLES_PER_SEO_CATEGORY

const GROUP_INTRO: Record<VehicleCategory, string> = {
  SUV: 'SUVs y crossovers documentados en Sin Frenos, de compactos a versiones de lujo, con ficha técnica completa y fuente citada en cada dato.',
  Sedán: 'Sedanes documentados en Sin Frenos, desde compactos hasta versiones ejecutivas, con ficha técnica completa y fuente citada en cada dato.',
  Hatchback: 'Hatchbacks documentados en Sin Frenos, con ficha técnica completa y fuente citada en cada dato.',
  Pickup: 'Pickups documentadas en Sin Frenos, de uso liviano a pesado, con ficha técnica completa y fuente citada en cada dato.',
  Deportivo: 'Autos deportivos y gran turismo documentados en Sin Frenos, con ficha técnica completa y fuente citada en cada dato.',
  Familiar: 'Familiares y station wagons documentados en Sin Frenos, con ficha técnica completa y fuente citada en cada dato.',
  Coupé: 'Coupés documentados en Sin Frenos, con ficha técnica completa y fuente citada en cada dato.',
  Cabrio: 'Cabrios y descapotables documentados en Sin Frenos, con ficha técnica completa y fuente citada en cada dato.',
  Monovolumen: 'Monovolúmenes y minivans documentados en Sin Frenos, con ficha técnica completa y fuente citada en cada dato.',
  Utilitario: 'Utilitarios documentados en Sin Frenos, con ficha técnica completa y fuente citada en cada dato.',
  Moto: 'Motos y scooters documentados en Sin Frenos, con ficha técnica completa y fuente citada en cada dato.',
  Otros: '',
}

interface PageProps {
  params: Promise<{ grupo: string }>
}

export async function generateStaticParams() {
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const available = computeSeoCategoryOptions(vehicles)
  return available.map(({ group }) => ({ grupo: categoryToSlug(group) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grupo } = await params
  const group = categoryFromSlug(grupo)
  if (!group) return {}

  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const count = vehicles.filter((v) => getVehicleCategory(v.class) === group).length
  const title = `${group} | Catálogo de ${group.toLowerCase()}s | ${SITE_NAME}`
  const description = `${count} ${group.toLowerCase()}s documentados con ficha técnica completa, evidencia citada y comparador. ${GROUP_INTRO[group]}`

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: `${SITE_URL}/categorias/${grupo}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/categorias/${grupo}`,
      siteName: SITE_NAME,
    },
  }
}

export default async function CategoryGroupPage({ params }: PageProps) {
  const { grupo } = await params
  const group = categoryFromSlug(grupo)
  if (!group) notFound()

  const allVehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const vehicles = allVehicles.filter((v) => getVehicleCategory(v.class) === group)
  if (vehicles.length < MIN_VEHICLES_PER_GROUP) notFound()

  // "Otras categorías" (FASE 6, Gap 2): navegación relacionada hacia las
  // demás páginas de categoría que sí existen hoy (mismo criterio que
  // generateStaticParams — nunca linkea a una categoría bajo el umbral,
  // que respondería 404). Excluye la categoría actual.
  const otherCategories = computeSeoCategoryOptions(allVehicles).filter(({ group: g }) => g !== group)

  // Orden por potencia descendente: además de agrupar por categoría,
  // la página funciona como un ranking liviano ("los SUV más potentes
  // del catálogo primero") — mismo dato que ya alimenta el sort "mejor
  // rendimiento" del listado general, sin cálculo nuevo. Los que no
  // tienen potencia parseable van al final, sin inventar un valor.
  const sorted = [...vehicles].sort((a, b) => {
    const powerA = parsePowerHp(a)
    const powerB = parsePowerHp(b)
    if (powerA === null && powerB === null) return 0
    if (powerA === null) return 1
    if (powerB === null) return -1
    return powerB - powerA
  })

  const relationCountEntries = await Promise.all(
    sorted.map(async (v) => [v.slug, await getBidirectionalRelationCount(v)] as const)
  )
  const relationCountBySlug = Object.fromEntries(relationCountEntries)
  const imageBySlug = getEntityImageMap(sorted)

  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: 'Vehículos', url: '/vehiculos' },
    { label: group, url: `/categorias/${grupo}` },
  ])

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${group} | ${SITE_NAME}`,
    description: GROUP_INTRO[group],
    url: `${SITE_URL}/categorias/${grupo}`,
    numberOfItems: sorted.length,
  }

  return (
    <section className="relative overflow-hidden border-b border-auto-border py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionLd) }}
      />
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
            <span className="text-auto-text">{group}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="category-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-auto-accent">
              <CategoryIcon type={EntityType.VEHICLE} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-auto-text">{group}</h1>
              <p className="mt-1 max-w-2xl text-auto-text-secondary">
                {sorted.length} {group.toLowerCase()}s documentados, ordenados por potencia. {GROUP_INTRO[group]}
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="stagger grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {sorted.map((vehicle) => (
            <EntityCard
              key={vehicle.slug}
              entity={vehicle}
              image={imageBySlug[`${vehicle.type}/${vehicle.slug}`]}
              typeLabel="Vehículo"
              relationCount={relationCountBySlug[vehicle.slug]}
            />
          ))}
        </Reveal>

        {otherCategories.length > 0 && (
          <Reveal className="mt-12 border-t border-auto-border pt-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-auto-text-tertiary">
              Otras categorías
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map(({ group: other, count }) => (
                <Link
                  key={other}
                  href={`/categorias/${categoryToSlug(other)}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-auto-border bg-auto-surface-elevated/80 px-3 py-1.5 text-sm text-auto-text-secondary transition-colors hover:border-auto-accent hover:text-auto-accent-strong"
                >
                  {other}
                  <span className="text-xs text-auto-text-tertiary">({count})</span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
