import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
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
import { AdUnit } from '@/components/monetization/AdUnit'
import { VehicleValueCard } from '@/components/seo/VehicleValueCard'
import { SITE_NAME, SITE_URL } from '@/config/site'

const MIN_VEHICLES_PER_GROUP = MIN_VEHICLES_PER_SEO_CATEGORY

const GROUP_INTRO: Record<string, string> = {
  SUV: 'Los SUVs con mejor relación calidad-precio del catálogo, ordenados por valor real: más equipamiento, potencia y espacio por cada dólar invertido.',
  Sedán: 'Los sedanes con mejor relación calidad-precio, evaluando espacio, confort, consumo y equipamiento por peso.',
  Hatchback: 'Los hatchbacks con mejor relación calidad-precio, ideales para ciudad con máxima versatilidad por peso.',
  Pickup: 'Las pickups con mejor relación capacidad-precio, evaluando carga, torque y robustez por dólar.',
  Deportivo: 'Los deportivos con mejor relación rendimiento-precio, caballos de fuerza y prestaciones por dólar.',
  Familiar: 'Los familiares con mejor relación espacio-precio, versatilidad y confort familiar por dólar.',
  Coupé: 'Los coupés con mejor relación estilo-rendimiento-precio, diseño y prestaciones por dólar.',
  Cabrio: 'Los descapotables con mejor relación experiencia-precio, placer de conducción a cielo abierto por dólar.',
  Monovolumen: 'Los monovolúmenes con mejor relación capacidad-precio, plazas y modularidad por dólar.',
  Utilitario: 'Los utilitarios con mejor relación trabajo-precio, carga útil y robustez por dólar.',
  Moto: 'Las motos con mejor relación rendimiento-precio, cilindrada y prestaciones por dólar.',
  Otros: '',
}

function calculateValueScore(vehicle: Vehicle): number | null {
  const power = parsePowerHp(vehicle)
  const priceUsd = parsePriceUsd(vehicle as any)
  
  if (power === null || priceUsd === null || priceUsd <= 0) return null
  
  // Score = (potencia * 1000) / precio en USD
  // Normalizado para que sea más legible
  return Math.round((power * 1000) / priceUsd)
}

function getValueTier(score: number): 'excelente' | 'buena' | 'regular' | 'basica' {
  if (score >= 30) return 'excelente'
  if (score >= 20) return 'buena'
  if (score >= 12) return 'regular'
  return 'basica'
}

function getValueTierLabel(tier: string): string {
  switch (tier) {
    case 'excelente': return 'Mejor compra'
    case 'buena': return 'Buena opción'
    case 'regular': return 'Opción válida'
    default: return 'Básica'
  }
}

function getValueTierColor(tier: string): string {
  switch (tier) {
    case 'excelente': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'buena': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'regular': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400'
  }
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
  const categoryVehicles = vehicles.filter((v) => getVehicleCategory(v.class) === group)
  const validVehicles = categoryVehicles.filter(v => {
    const score = calculateValueScore(v)
    return score !== null && score > 0
  })
  const count = validVehicles.length
  
  const title = `Mejor calidad-precio en ${group} | ${SITE_NAME}`
  const description = `${count} ${group.toLowerCase()}s con la mejor relación calidad-precio del catálogo. ${GROUP_INTRO[group]}`

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: `${SITE_URL}/categorias/${grupo}/mejor-calidad-precio` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/categorias/${grupo}/mejor-calidad-precio`,
      siteName: SITE_NAME,
    },
  }
}

function calculateValueScore(vehicle: Vehicle): number | null {
  const power = parsePowerHp(vehicle)
  const priceUsd = parsePriceUsd(vehicle as any)
  
  if (power === null || priceUsd === null || priceUsd <= 0) return null
  
  // Score = (potencia * 1000) / precio en USD
  // Normalizado para que sea más legible
  return Math.round((power * 1000) / priceUsd)
}

function getValueTier(score: number): 'excelente' | 'buena' | 'regular' | 'basica' {
  if (score >= 30) return 'excelente'
  if (score >= 20) return 'buena'
  if (score >= 12) return 'regular'
  return 'basica'
}

function getValueTierLabel(tier: string): string {
  switch (tier) {
    case 'excelente': return 'Mejor compra'
    case 'buena': return 'Buena opción'
    case 'regular': return 'Opción válida'
    default: return 'Básica'
  }
}

function getValueTierColor(tier: string): string {
  switch (tier) {
    case 'excelente': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'buena': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'regular': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400'
  }
}

interface PageProps {
  params: Promise<{ grupo: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grupo } = await params
  const group = categoryFromSlug(grupo)
  if (!group) return {}

  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const categoryVehicles = vehicles.filter((v) => getVehicleCategory(v.class) === group)
  const validVehicles = categoryVehicles.filter(v => {
    const score = calculateValueScore(v)
    return score !== null && score > 0
  })
  const count = validVehicles.length
  
  const title = `Mejor calidad-precio en ${group} | ${SITE_NAME}`
  const description = `${count} ${group.toLowerCase()}s con la mejor relación calidad-precio del catálogo. ${GROUP_INTRO[group]}`

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: `${SITE_URL}/categorias/${grupo}/mejor-calidad-precio` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/categorias/${grupo}/mejor-calidad-precio`,
      siteName: SITE_NAME,
    },
  }
}

function calculateValueScore(vehicle: Vehicle): number | null {
  const power = parsePowerHp(vehicle)
  const priceUsd = parsePriceUsd(vehicle as any)
  
  if (power === null || priceUsd === null || priceUsd <= 0) return null
  
  // Score = (potencia * 1000) / precio en USD
  // Normalizado para que sea más legible
  return Math.round((power * 1000) / priceUsd)
}

function getValueTier(score: number): 'excelente' | 'buena' | 'regular' | 'basica' {
  if (score >= 30) return 'excelente'
  if (score >= 20) return 'buena'
  if (score >= 12) return 'regular'
  return 'basica'
}

interface PageProps {
  params: Promise<{ grupo: string }>
}

export default async function CategoryBestValuePage({ params }: PageProps) {
  const { grupo } = await params
  const group = categoryFromSlug(grupo)
  if (!group) notFound()

  const allVehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const vehicles = allVehicles.filter((v) => getVehicleCategory(v.class) === group)
  if (vehicles.length < MIN_VEHICLES_PER_GROUP) notFound()

  // Calcular score de valor para cada vehículo
  const vehiclesWithScore = vehicles
    .map(v => {
      const score = calculateValueScore(v)
      const tier = score !== null ? (score >= 30 ? 'excelente' : score >= 20 ? 'buena' : score >= 12 ? 'regular' : 'basica') : 'basica'
      return { ...v, score, tier }
    })
    .filter(v => v.score !== null && v.score > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))

  if (vehiclesWithScore.length === 0) notFound()

  // Otras categorías para navegación
  const allVehiclesForNav = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const otherCategories = computeSeoCategoryOptions(allVehiclesForNav).filter(({ group: g }) => g !== group)

  const imageBySlug = getEntityImageMap(vehiclesWithScore.map(v => ({ type: 'vehiculos', slug: v.slug })))

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Vehículos', item: `${SITE_URL}/vehiculos` },
      { '@type': 'ListItem', position: 3, name: group, item: `${SITE_URL}/categorias/${categoryToSlug(group)}` },
      { '@type': 'ListItem', position: 4, name: 'Mejor calidad-precio', item: `${SITE_URL}/categorias/${categoryToSlug(group)}/mejor-calidad-precio` },
    ],
  }

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Mejor calidad-precio en ${group} | ${SITE_NAME}`,
    description: `${vehiclesWithScore.length} ${group.toLowerCase()}s con la mejor relación calidad-precio.`,
    url: `${SITE_URL}/categorias/${categoryToSlug(group)}/mejor-calidad-precio`,
    numberOfItems: vehiclesWithScore.length,
  }

  // Import VehicleValueCard dynamically to avoid server-side rendering issues
  const VehicleValueCard = (await import('@/components/seo/VehicleValueCard')).VehicleValueCard

  return (
    <section className="relative overflow-hidden border-b border-edge py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `Mejor calidad-precio en ${group} | ${SITE_NAME}`,
          description: `${vehiclesWithScore.length} ${group.toLowerCase()}s con la mejor relación calidad-precio.`,
          url: `${SITE_URL}/categorias/${categoryToSlug(group)}/mejor-calidad-precio`,
          numberOfItems: vehiclesWithScore.length,
        }).replace(/</g, '\\u003c') }}
      />
      <div className="list-header-glow" aria-hidden="true" />
      <div className="container-max relative">
        <Reveal direction="chapter" className="mb-10">
          <nav className="mb-4 text-sm text-neutral-500" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <Link href="/vehiculos" className="link-underline transition-colors hover:text-auto-accent">
              Vehículos
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/categorias/${categoryToSlug(group)}`} className="link-underline transition-colors hover:text-auto-accent">
              {group}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-900">Mejor calidad-precio</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="category-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-auto-accent">
              <CategoryIcon type={EntityType.VEHICLE} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-neutral-900">Mejor calidad-precio en {group}</h1>
              <p className="mt-1 max-w-2xl text-neutral-500">
                {vehiclesWithScore.length} {group.toLowerCase()}s ordenados por relación potencia/precio.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="stagger grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {vehiclesWithScore.slice(0, 20).map((vehicle, index) => (
            <Reveal key={vehicle.slug} index={index} total={Math.min(vehiclesWithScore.length, 20)} className="h-full">
              <div className="h-full">
                <a
                  href={`/vehiculos/${vehicle.slug}`}
                  className="group block h-full"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-alt">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-auto-accent/15 text-auto-accent-strong border border-auto-accent/30 text-xs">
                          {vehicle.manufacturer}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${['excelente', 'buena', 'regular'].includes(vehicle.tier) ? 
                          (vehicle.tier === 'excelente' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                           vehicle.tier === 'buena' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                           'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400') :
                          'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                          {vehicle.tier === 'excelente' ? 'Mejor compra' : vehicle.tier === 'buena' ? 'Buena opción' : vehicle.tier === 'regular' ? 'Opción válida' : 'Básica'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <h3 className="font-display text-lg font-bold text-neutral-900 group-hover:text-auto-accent transition-colors line-clamp-1">
                      {vehicle.title}
                    </h3>
                    <p className="text-sm text-neutral-500 font-medium">
                      {vehicle.manufacturer} · {vehicle.class}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-neutral-900">
                        {vehicle.power || '—'}
                      </span>
                      <span className="font-mono text-auto-accent-strong">
                        Score: {vehicle.score}
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            </Reveal>
          ))}
        </Reveal>

        <AdUnit slotId="3119092668" format="responsive" className="mt-12" dataTrackingLabel={`ad-categoria-${categoryToSlug(group)}-best-value`} />

        <Reveal className="mt-12 border-t border-edge pt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Otras categorías
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherCategories.map(({ group: other, count }) => (
              <Link
                key={other}
                href={`/categorias/${categoryToSlug(other)}/mejor-calidad-precio`}
                className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-surface-alt/80 px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:border-auto-accent hover:text-auto-accent-strong"
              >
                {other}
                <span className="text-auto-accent/70">({count})</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}