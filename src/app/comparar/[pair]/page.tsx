import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { getFixedComparisonPairs, resolveFixedComparisonPair, fixedComparisonSlug } from '@/lib/fixed-comparisons'
import { VehicleCompareTable } from '@/components/entities/VehicleCompareSheet'
import { generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { AdUnit } from '@/components/monetization/AdUnit'
import { MercadoLibreAffiliateButton } from '@/components/monetization/MercadoLibreAffiliateButton'
import { MonetizationCtaGroup } from '@/components/monetization/MonetizationCtaGroup'

/**
 * Comparaciones fijas SEO 1-a-1 (Product Growth Audit, oportunidad #11).
 * Solo existen para pares curados como `competidor` en el contenido real
 * (ver `fixed-comparisons.ts`) — no para cualquier combinación de dos
 * vehículos, que sería thin/duplicate content sin criterio (Fase 19,
 * "DO NOT BUILD YET", punto 4 del audit).
 */

interface PageProps {
  params: Promise<{ pair: string }>
}

export async function generateStaticParams() {
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const pairs = getFixedComparisonPairs(vehicles)
  return pairs.map(({ slugA, slugB }) => ({ pair: fixedComparisonSlug(slugA, slugB) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pair } = await params
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const resolved = resolveFixedComparisonPair(pair, vehicles)
  if (!resolved) return {}

  const a = vehicles.find((v) => v.slug === resolved.slugA)
  const b = vehicles.find((v) => v.slug === resolved.slugB)
  if (!a || !b) return {}

  const title = `${a.title} vs ${b.title}: comparación completa | ${SITE_NAME}`
  const description = `Comparación lado a lado entre ${a.title} y ${b.title}: precio, rendimiento, consumo, dimensiones y más, con ficha técnica y evidencia citada para cada dato.`

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: `${SITE_URL}/comparar/${pair}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/comparar/${pair}`,
      siteName: SITE_NAME,
    },
  }
}

export default async function FixedComparisonPage({ params }: PageProps) {
  const { pair } = await params
  const vehicles = (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[]
  const resolved = resolveFixedComparisonPair(pair, vehicles)
  if (!resolved) notFound()

  const a = vehicles.find((v) => v.slug === resolved.slugA)
  const b = vehicles.find((v) => v.slug === resolved.slugB)
  if (!a || !b) notFound()

  const pairVehicles = [a, b]
  const imageBySlug = getEntityImageMap(pairVehicles)

  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: 'Comparar', url: '/comparar' },
    { label: `${a.title} vs ${b.title}`, url: `/comparar/${pair}` },
  ])

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      <Reveal>
        <nav className="mb-4 text-sm text-neutral-500" aria-label="Breadcrumb">
          <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <Link href="/comparar" className="link-underline transition-colors hover:text-auto-accent">
            Comparar
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-900">
            {a.title} vs {b.title}
          </span>
        </nav>

        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            {a.title} <span className="text-gradient-vice">vs</span> {b.title}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 sm:text-base">
            Comparación lado a lado: precio, rendimiento, consumo, dimensiones y más, con ficha
            técnica y evidencia citada para cada dato.
          </p>
        </div>
      </Reveal>

      <VehicleCompareTable vehicles={pairVehicles} imageBySlug={imageBySlug} />

      {/* Auditoría de monetización (2026-09): esta era, de todo el
          sitio, la página con mayor intención de compra sin un solo
          punto de monetización — alguien que llega a "Auto A vs Auto B"
          ya descartó todo lo demás y está eligiendo entre dos opciones
          concretas. Antes no tenía ni el botón de Mercado Libre (que sí
          existe en la ficha individual de cada auto) ni el AdUnit. */}
      <Reveal delay={60} className="mt-8 flex flex-wrap justify-center gap-3">
        <MercadoLibreAffiliateButton
          vehicleName={a.title}
          buttonText={`Ver ${a.title} en Mercado Libre`}
          trackingLabel={`comparar-${pair}-ml-a`}
        />
        <MercadoLibreAffiliateButton
          vehicleName={b.title}
          buttonText={`Ver ${b.title} en Mercado Libre`}
          trackingLabel={`comparar-${pair}-ml-b`}
        />
      </Reveal>

      <Reveal delay={100} className="mt-6">
        <MonetizationCtaGroup trackingLabelPrefix={`comparar-${pair}`} />
      </Reveal>

      <AdUnit slotId="5425797006" format="responsive" className="mt-10" dataTrackingLabel={`ad-comparar-${pair}`} />

      <Reveal className="mt-8">
        <Link
          href={`/comparar?v=${encodeURIComponent(a.slug)},${encodeURIComponent(b.slug)}`}
          className="link-underline text-sm text-neutral-500 transition-colors hover:text-auto-accent"
        >
          Agregar más vehículos a esta comparación →
        </Link>
      </Reveal>
    </div>
  )
}
