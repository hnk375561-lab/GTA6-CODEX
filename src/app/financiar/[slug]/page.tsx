import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Vehicle } from '@/types'
import { getEntity, getEntitySlugs } from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { parsePriceUsd } from '@/lib/vehicle-price'
import { generateEntityMetadata, serializeJsonLd } from '@/lib/seo'
import { FinancingCalculator } from '@/components/ui/FinancingCalculator'
import { Card, CardBody } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'
import Link from 'next/link'
import Image from 'next/image'
import { SITE_URL } from '@/config/site'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface FinancingLandingProps {
  vehicle: Vehicle
  priceUsd: number | null
  priceDisplay: string
}

async function getVehicleData(slug: string) {
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) return null

  const image = resolveEntityDisplayImage(vehicle)
  const priceUsd = parsePriceUsd(vehicle as any)
  const priceDisplay = vehicle.price || 'Precio no disponible'

  return { vehicle, priceUsd, priceDisplay }
}

function FinancingLandingClient({ vehicle, priceUsd, priceDisplay }: { vehicle: Vehicle; priceUsd: number | null; priceDisplay: string }) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <Reveal direction="up">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface-alt">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-white/80 font-mono text-sm">
                  Financiamiento
                </span>
                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                  Simulador de cuota
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Financiar {vehicle.title}
              </h1>
              <p className="text-white/80 text-lg max-w-xl mb-4">
                Simulá tu cuota mensual con el precio real de mercado. Ajustá entrega, plazo y tasa.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-white/70 text-sm">Precio de referencia:</span>
                <span className="text-2xl font-bold text-white">{vehicle.price}</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Calculadora */}
      <Reveal direction="up" delay={100}>
        <section aria-labelledby="calculator-heading">
          <h2 id="calculator-heading" className="sr-only">Calculadora de financiamiento</h2>
          <div className="max-w-xl mx-auto">
            <FinancingCalculator />
          </div>
        </section>
      </Reveal>

      {/* Detalles del vehículo */}
      <Reveal direction="up" delay={200}>
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="sr-only">Detalles del vehículo</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center transition-colors hover:border-auto-accent/50 rounded-xl border border-edge bg-surface-card p-6">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Precio</dt>
              <dd className="font-display text-2xl font-bold text-neutral-900">{vehicle.price}</dd>
            </div>
            <div className="text-center transition-colors hover:border-auto-accent/50 rounded-xl border border-edge bg-surface-card p-6">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Potencia</dt>
              <dd className="font-display text-2xl font-bold text-neutral-900">{vehicle.power || '—'}</dd>
            </div>
            <div className="text-center transition-colors hover:border-auto-accent/50 rounded-xl border border-edge bg-surface-card p-6">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Consumo</dt>
              <dd className="font-display text-2xl font-bold text-neutral-900">{vehicle.consumo || '—'}</dd>
            </div>
            <div className="text-center transition-colors hover:border-auto-accent/50 rounded-xl border border-edge bg-surface-card p-6">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Clase</dt>
              <dd className="font-display text-xl font-bold text-neutral-900">{vehicle.class}</dd>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Formulario de contacto/lead */}
      <Reveal direction="up" delay={200}>
        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="sr-only">Solicitar financiamiento</h2>
          <div className="max-w-xl mx-auto">
            <div className="rounded-2xl border border-auto-accent/30 bg-auto-accent/5 p-6 sm:p-8 text-center">
              <h3 className="mb-2 font-display text-2xl font-bold text-neutral-900">¿Querés financiar este vehículo?</h3>
              <p className="mb-6 text-neutral-500 max-w-md mx-auto">
                Completá el formulario y te contactamos para avanzar con la simulación y la gestión del crédito.
              </p>
              <Link
                href={`/financiamiento?vehiculo=${encodeURIComponent(vehicle.title)}&precio=${encodeURIComponent(String(parsePriceUsd(vehicle as any) || 0))}`}
                className="inline-flex items-center gap-2 rounded-lg bg-auto-accent px-6 py-3 font-display text-sm font-semibold text-auto-darker transition-transform hover:scale-105 active:scale-95"
              >
                Ir a la calculadora completa
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7-7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Beneficios */}
      <Reveal direction="up" delay={300}>
        <section aria-labelledby="benefits-heading">
          <h2 id="benefits-heading" className="sr-only">Beneficios de financiar con nosotros</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center transition-colors hover:border-auto-accent/50 rounded-xl border border-edge bg-surface-card p-6">
              <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-auto-accent/10 text-auto-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">Tasas competitivas</h3>
              <p className="text-sm text-neutral-500">Accedé a tasas preferenciales con nuestros bancos partners.</p>
            </div>
            <div className="text-center transition-colors hover:border-auto-accent/50 rounded-xl border border-edge bg-surface-card p-6">
              <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-auto-accent/10 text-auto-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">Plazos flexibles</h3>
              <p className="text-sm text-neutral-500">Plazos de 12 a 72 meses. Elegí el que mejor se adapte a tu bolsillo.</p>
            </div>
            <div className="text-center transition-colors hover:border-auto-accent/50">
              <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-auto-accent/10 text-auto-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">Gestión 100% digital</h3>
              <p className="text-sm text-neutral-500">Todo el proceso online. Sin trámites presenciales innecesarios.</p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Navegación relacionada */}
      <nav aria-label="Navegación relacionada" className="space-y-4">
        <Link
          href={`/vehiculos/${vehicle.slug}`}
          className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface-card px-4 py-3 text-sm font-medium text-neutral-900 transition-colors hover:border-auto-accent hover:bg-surface-card-hover"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Volver a la ficha del vehículo</span>
        </Link>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/comparar"
            className="inline-flex items-center gap-2 rounded-lg border border-auto-accent/35 bg-auto-accent/15 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-auto-accent-strong transition-colors hover:bg-auto-accent/25"
          >
            Comparar con otros modelos
          </Link>
          <Link
            href="/financiamiento"
            className="inline-flex items-center gap-2 rounded-lg bg-auto-accent px-4 py-2 text-sm font-semibold text-auto-darker transition-transform hover:scale-105 active:scale-95"
          >
            Ver calculadora completa
          </Link>
        </div>
      </nav>
    </div>
  )
}

async function getVehicleData(slug: string) {
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) return null

  const image = resolveEntityDisplayImage(vehicle)
  const priceUsd = parsePriceUsd(vehicle as any)
  const priceDisplay = vehicle.price || 'Precio no disponible'

  return { vehicle, priceUsd, priceDisplay }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) return {}

  const priceUsd = parsePriceUsd(vehicle as any)
  const title = `Financiar ${vehicle.title} | Simulador de cuota | Sin Frenos`
  const description = `Simulá la cuota mensual para financiar el ${vehicle.title}. Precio desde ${vehicle.price}. Calculá entrega, plazo y tasa. Preaprobación online.`

  return {
    title,
    description,
    metadataBase: new URL('https://sinfreno.vercel.app'),
    alternates: {
      canonical: `https://sinfreno.vercel.app/financiar/${slug}`,
    },
    openGraph: {
      type: 'website',
      title: `Financiar ${vehicle.title} | Simulador de cuota`,
      description: `Calculá la cuota mensual para el ${vehicle.title}. Precio: ${vehicle.price}. Simulá entrega, plazo y tasa.`,
      url: `https://sinfreno.vercel.app/financiar/${slug}`,
      siteName: 'Sin Frenos',
      images: [{ url: 'https://sinfreno.vercel.app/og-image.png', width: 1200, height: 630, alt: `Financiar ${vehicle.title}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Financiar ${vehicle.title} | Simulador`,
      description: `Simulá la cuota del ${vehicle.title}. Precio: ${vehicle.price}.`,
      images: ['https://sinfreno.vercel.app/og-image.png'],
    },
  }
}

export async function generateStaticParams() {
  const slugs = await getEntitySlugs('vehiculos')
  const vehicles = await Promise.all(slugs.map(slug => getEntity('vehiculos', slug)))
  return vehicles
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .filter(v => {
      const priceUsd = parsePriceUsd(v as any)
      return priceUsd !== null && priceUsd > 0
    })
    .map(v => ({ slug: v.slug }))
}

export default async function FinancingLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) notFound()

  const priceUsd = parsePriceUsd(vehicle as any)
  if (!priceUsd || priceUsd <= 0) notFound()

  const priceDisplay = vehicle.price || 'Precio no disponible'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `Calculadora de financiamiento - ${vehicle.title}`,
    description: `Simulador de cuota mensual para el ${vehicle.title}. Precio: ${vehicle.price}. Calculá entrega, plazo y tasa.`,
    url: `https://sinfreno.vercel.app/financiar/${slug}`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: vehicle.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: [
      'Calculadora de cuota mensual',
      'Simulación de entrega y plazo',
      'Tasa de interés configurable',
      'Preaprobación online',
      'Envío de simulación por WhatsApp'
    ],
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    softwareVersion: '1.0',
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `Financiar ${vehicle.title}`,
          description: `Simulador de cuota mensual para el ${vehicle.title}. Precio: ${vehicle.price}.`,
          url: `https://sinfreno.vercel.app/financiar/${slug}`,
          mainEntity: {
            '@type': 'Vehicle',
            name: vehicle.title,
            description: `Ficha técnica del ${vehicle.title}`,
            url: `https://sinfreno.vercel.app/vehiculos/${slug}`,
            manufacturer: vehicle.manufacturer,
            model: vehicle.title,
            vehicleModelDate: vehicle.anoProduccion,
            vehicleConfiguration: 'Financiamiento',
            vehicleModelYear: new Date().getFullYear(),
          },
          mainEntity: {
            '@type': 'WebApplication',
            name: `Calculadora de financiamiento - ${vehicle.title}`,
            description: `Simulador de cuota mensual para el ${vehicle.title}. Precio: ${vehicle.price}.`,
            url: `https://sinfreno.vercel.app/financiar/${slug}`,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            featureList: [
              'Calculadora de cuota mensual',
              'Simulación de entrega y plazo',
              'Tasa de interés configurable',
              'Preaprobación online',
              'Envío de simulación por WhatsApp'
            ],
            operatingSystem: 'Web',
            browserRequirements: 'Requires JavaScript. Requires HTML5.',
          }
        }) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://sinfreno.vercel.app' },
            { '@type': 'ListItem', position: 2, name: 'Vehículos', item: 'https://sinfreno.vercel.app/vehiculos' },
            { '@type': 'ListItem', position: 3, name: vehicle.title, item: `https://sinfreno.vercel.app/vehiculos/${slug}` },
            { '@type': 'ListItem', position: 4, name: 'Financiar', item: `https://sinfreno.vercel.app/financiar/${slug}` },
          ],
        }) }}
      />
      <FinancingLandingClient vehicle={vehicle as any} priceUsd={parsePriceUsd(vehicle as any)} priceDisplay={vehicle.price} />
    </>
  )
}