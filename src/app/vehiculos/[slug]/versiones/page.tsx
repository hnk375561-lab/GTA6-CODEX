import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Vehicle } from '@/types'
import { getEntity, getEntitySlugs } from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { extractVehicleVariants, hasMultipleVariants } from '@/lib/vehicle-variants'
import { generateEntityMetadata, serializeJsonLd } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { SITE_URL } from '@/config/site'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface VehicleVersionsProps {
  vehicle: Vehicle
  variants: Array<{
    nombre: string
    precio: string
    power?: string
    transmission?: string
    consumption?: string
    dimensions?: string
    acceleration?: string
    speed?: string
    equipamiento?: string[]
    traccion?: string
    cilindrada?: string
    peso?: string | number
    baul?: string | number
  }>
}

function VehicleVersionsClient({ vehicle, variants }: VehicleVersionsProps) {
  if (variants.length <= 1) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 text-auto-accent text-4xl" aria-hidden="true">🚗</div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Sin versiones múltiples disponibles</h2>
        <p className="text-neutral-500 max-w-md mx-auto">
          Este vehículo no tiene múltiples versiones/trims documentadas con diferencias de especificación para generar una página de comparación.
        </p>
        <Link
          href={`/vehiculos/${vehicle.slug}`}
          className="mt-6 inline-flex items-center gap-2 text-auto-accent hover:underline"
        >
          ← Volver a la ficha de {vehicle.title}
        </Link>
      </div>
    )
  }

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
                  {variants.length} versiones disponibles
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Versiones del {vehicle.title}
              </h1>
              <p className="text-white/80 text-lg max-w-xl">
                Compará las {variants.length} versiones disponibles del {vehicle.title} y descubrí cuál se adapta mejor a tus necesidades.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Tabla comparativa */}
      <Reveal direction="up" delay={100}>
        <section aria-labelledby="comparison-heading">
          <h2 id="comparison-heading" className="sr-only">Comparativa de versiones</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-edge text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="pb-3 px-4 sticky left-0 bg-surface-page z-10">Versión</th>
                  <th className="pb-3 px-4">Precio</th>
                  <th className="pb-3 px-4">Potencia</th>
                  <th className="pb-3 px-4">Motor</th>
                  <th className="pb-3 px-4">Transmisión</th>
                  <th className="pb-3 px-4">Tracción</th>
                  <th className="pb-3 px-4">0-100 km/h</th>
                  <th className="pb-3 px-4">Vel. máx.</th>
                  <th className="pb-3 px-4">Consumo</th>
                  <th className="pb-3 px-4">Peso</th>
                  <th className="pb-3 px-4">Baúl</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {variants.map((variant, index) => (
                  <tr key={variant.nombre} className="transition-colors hover:bg-surface-alt/50">
                    <td className="py-4 px-4 font-medium text-neutral-900">{variant.nombre}</td>
                    <td className="py-3 px-4 font-mono text-neutral-900">{variant.precio || '—'}</td>
                    <td className="py-3 px-4 text-neutral-900">{variants[0].power || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{variant.cilindrada || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{variant.transmission || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{variant.traccion || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{variant.acceleration || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{variant.speed || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{variant.consumption || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{variant.peso || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{variant.baul || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-neutral-500">
              Los valores mostrados corresponden a la configuración base del modelo; los valores específicos por versión pueden variar.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Diferencias clave */}
      <Reveal direction="up" delay={200}>
        <section aria-labelledby="differences-heading">
          <h2 id="differences-heading" className="mb-6 text-2xl font-bold text-neutral-900">Diferencias clave entre versiones</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries({
              Potencia: 'power',
              Transmisión: 'transmission',
              Consumo: 'consumption',
              Aceleración: 'acceleration',
              Velocidad: 'speed',
              Precio: 'price',
              Tracción: 'traction',
              Cilindrada: 'engine',
              Peso: 'weight',
              Baúl: 'trunk',
            }).map(([label, key]) => {
              const values = variants.map(v => (v as any)[key]).filter(Boolean)
              const uniqueValues = [...new Set(values)]
              if (uniqueValues.length <= 1) return null
              return (
                <Reveal key={label} direction="up">
                  <div className="rounded-xl border border-edge bg-surface-card p-5 transition-colors hover:border-auto-accent/50">
                    <h3 className="mb-3 font-mono text-lg font-semibold text-auto-accent">{label}</h3>
                    <ul className="space-y-2">
                      {variants.map((v, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-neutral-900 flex-1 text-right pr-2">
                            {(v as any)[key] || '—'}
                          </span>
                          <span className="text-neutral-500 text-sm">{variants[i].nombre || `Versión ${i + 1}`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )
            )}
          </div>
        </section>
      </Reveal>

      {/* Navegación relacionada */}
      <Reveal direction="up" delay={300}>
        <nav aria-label="Navegación relacionada" className="space-y-4">
          <Link
            href={`/vehiculos/${vehicle.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface-card px-4 py-3 text-sm font-medium text-neutral-900 transition-colors hover:border-auto-accent hover:bg-surface-card-hover"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Volver a la ficha de {vehicle.title}</span>
          </Link>
          <div className="flex flex-wrap gap-3">
            {vehicle.categoryHref && (
              <Link
                href={vehicle.categoryHref}
                className="inline-flex items-center gap-2 rounded-lg border border-auto-accent/35 bg-auto-accent/15 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-auto-accent-strong transition-colors hover:bg-auto-accent/25"
              >
                Ver categoría {vehicle.class}
              </Link>
            )}
            <Link
              href={`/financiar/${vehicle.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-auto-accent px-4 py-2 text-sm font-semibold text-auto-darker transition-transform hover:scale-105 active:scale-95"
            >
              Financiar este modelo
            </Link>
          </div>
        </nav>
      </Reveal>
    </div>
  )
}

async function getVehicleData(slug: string) {
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) return null
  const image = resolveEntityDisplayImage(vehicle)
  const variants = (await import('@/lib/vehicle-variants')).extractVehicleVariants(vehicle)
  return { vehicle, image, variants }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) return {}

  return generateEntityMetadata(vehicle, resolveEntityDisplayImage(vehicle))
}

export async function generateStaticParams() {
  const slugs = await getEntitySlugs('vehiculos')
  const vehicles = await Promise.all(slugs.map(slug => getEntity('vehiculos', slug)))
  return vehicles
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .filter(v => hasMultipleVariants(v))
    .map(v => ({ slug: v.slug }))
}

function createJsonLdItemList(vehicle: any, variants: any[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Versiones del ' + vehicle.title,
    description: 'Comparativa de las ' + variants.length + ' versiones del ' + vehicle.title + ' con especificaciones y precios',
    itemListElement: variants.map((variant, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: vehicle.title + ' ' + variant.nombre,
      description: 'Versión ' + variant.nombre + ' del ' + vehicle.title,
      url: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones#' + variant.nombre.toLowerCase().replace(/\s+/g, '-'),
    }),
    numberOfItems: variants.length,
  }
}

function createJsonLdVehicle(vehicle: any, variants: any[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: vehicle.title,
    description: 'Comparativa de ' + variants.length + ' versiones del ' + vehicle.title,
    url: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones',
    vehicleConfiguration: variants.map((v) => ({
      '@type': 'VehicleConfiguration',
      name: v.nombre,
      price: v.precio,
      engineDisplacement: v.cilindrada,
      vehicleTransmission: v.transmission,
      fuelConsumption: v.consumption,
      accelerationTime: v.acceleration,
      maxSpeed: v.speed,
      vehicleEngine: {
        '@type': 'Engine',
        engineDisplacement: v.cilindrada,
        enginePower: { '@type': 'QuantitativeValue', value: v.power, unitCode: 'HP' }
      }
    })
  }
}

function createJsonLdBreadcrumb(vehicle: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://sinfreno.vercel.app' },
      { '@type': 'ListItem', position: 2, name: 'Vehículos', item: 'https://sinfreno.vercel.app/vehiculos' },
      { '@type': 'ListItem', position: 3, name: vehicle.title, item: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug },
      { '@type': 'ListItem', position: 4, name: 'Versiones', item: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones' },
    ],
  }
}

export default async function VehicleVersionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) notFound()

  const variants = extractVehicleVariants(vehicle)
  if (variants.length <= 1) notFound()

  const jsonLdItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Versiones del ' + vehicle.title,
    description: 'Comparativa de las ' + variants.length + ' versiones del ' + vehicle.title + ' con especificaciones y precios',
    itemListElement: variants.map((variant, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: vehicle.title + ' ' + variant.nombre,
      description: 'Versión ' + variant.nombre + ' del ' + vehicle.title,
      url: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones#' + variant.nombre.toLowerCase().replace(/\s+/g, '-'),
    }),
    numberOfItems: variants.length,
  }

  const jsonLdVehicle = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: vehicle.title,
    description: 'Comparativa de ' + variants.length + ' versiones del ' + vehicle.title,
    url: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones',
    vehicleConfiguration: variants.map((v) => ({
      '@type': 'VehicleConfiguration',
      name: v.nombre,
      price: v.precio,
      engineDisplacement: v.cilindrada,
      vehicleTransmission: v.transmission,
      fuelConsumption: v.consumption,
      accelerationTime: v.acceleration,
      maxSpeed: v.speed,
      vehicleEngine: {
        '@type': 'Engine',
        engineDisplacement: v.cilindrada,
        enginePower: { '@type': 'QuantitativeValue', value: v.power, unitCode: 'HP' }
      }
    })
  }

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://sinfreno.vercel.app' },
      { '@type': 'ListItem', position: 2, name: 'Vehículos', item: 'https://sinfreno.vercel.app/vehiculos' },
      { '@type': 'ListItem', position: 3, name: vehicle.title, item: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug },
      { '@type': 'ListItem', position: 4, name: 'Versiones', item: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones' },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'Versiones del ' + vehicle.title,
              description: 'Comparativa de las ' + variants.length + ' versiones del ' + vehicle.title + ' con especificaciones y precios',
              itemListElement: variants.map((variant, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: vehicle.title + ' ' + variant.nombre,
                description: 'Versión ' + variant.nombre + ' del ' + vehicle.title,
                url: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones#' + variant.nombre.toLowerCase().replace(/\s+/g, '-'),
              }),
              numberOfItems: variants.length,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Vehicle',
              name: vehicle.title,
              description: 'Comparativa de ' + variants.length + ' versiones del ' + vehicle.title,
              url: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones',
              vehicleConfiguration: vehicle.variants?.map((v: any) => ({
                '@type': 'VehicleConfiguration',
                name: v.nombre,
                price: v.precio,
                engineDisplacement: v.cilindrada,
                vehicleTransmission: v.transmission,
                fuelConsumption: v.consumption,
                accelerationTime: v.acceleration,
                maxSpeed: v.speed,
                vehicleEngine: {
                  '@type': 'Engine',
                  engineDisplacement: v.cilindrada,
                  enginePower: { '@type': 'QuantitativeValue', value: v.power, unitCode: 'HP' }
                }
              }) || []
            }
          ]
        }).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://sinfreno.vercel.app' },
            { '@type': 'ListItem', position: 2, name: 'Vehículos', item: 'https://sinfreno.vercel.app/vehiculos' },
            { '@type': 'ListItem', position: 3, name: vehicle.title, item: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug },
            { '@type': 'ListItem', position: 4, name: 'Versiones', item: 'https://sinfreno.vercel.app/vehiculos/' + vehicle.slug + '/versiones' },
          ],
        }).replace(/</g, '\\u003c') }}
      />
      <VehicleVersionsClient vehicle={vehicle as any} variants={variants as any} />
    </>
  )
}