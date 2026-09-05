import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Vehicle } from '@/types'
import { getEntity, getEntitySlugs } from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { getModelYearHistory } from '@/lib/vehicle-history'
import { generateEntityMetadata } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { SITE_URL } from '@/config/site'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface VehicleHistoryProps {
  vehicle: Vehicle
  history: ReturnType<typeof import('@/lib/vehicle-history').getModelYearHistory>
}

const TYPE_LABELS = {
  vehiculos: 'Vehículos',
  fabricantes: 'Fabricantes',
  noticias: 'Noticias',
  guias: 'Guías',
}

async function getVehicleData(slug: string) {
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) return null
  const image = resolveEntityDisplayImage(vehicle)
  const history = await import('@/lib/vehicle-history').then(m => m.getModelYearHistory(vehicle))
  return { vehicle, image, history }
}

function VehicleHistoryClient({ vehicle, history }: VehicleHistoryProps) {
  const { years, generations, launchYear, currentYear, hasHistory } = history

  if (!hasHistory || years.length <= 1) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 text-auto-accent text-4xl" aria-hidden="true">📅</div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Sin historial de años disponible</h2>
        <p className="text-neutral-500 max-w-md mx-auto">
          Este vehículo no tiene suficiente historial de años de modelo o facelifts documentados para generar una página de historial.
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
      <Reveal direction="up">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface-alt">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-white/80 font-mono text-sm">
                  {launchYear}–{currentYear === launchYear ? '' : currentYear}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Historial del {vehicle.title}
              </h1>
              <p className="text-white/80 text-lg max-w-xl">
                {years.length} años de evolución desde su lanzamiento en {launchYear}
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal direction="up" delay={100}>
        <section aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="sr-only">Línea de tiempo del modelo</h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-auto-accent/30" aria-hidden="true" />
            <div className="space-y-6 pl-14">
              {years.map((entry, index) => (
                <Reveal key={entry.year} direction="left" delay={index * 50}>
                  <div className="relative">
                    <div
                      className={entry.isCurrent
                        ? 'absolute -left-14 top-2 w-4 h-4 rounded-full bg-auto-accent border-3 border-auto-accent ring-2 ring-auto-accent/30'
                        : entry.isFacelift
                          ? 'absolute -left-14 top-2 w-4 h-4 rounded-full bg-auto-accent-orange border-3 border-auto-accent-orange'
                          : 'absolute -left-14 top-2 w-4 h-4 rounded-full bg-surface-page border-3 border-auto-accent/40'}
                      aria-hidden="true"
                    />
                    <div className={entry.isCurrent ? 'bg-surface-card rounded-xl p-5 ring-1 ring-auto-accent/50' : 'bg-surface-card rounded-xl p-5 border border-edge transition-colors hover:border-auto-accent/50'}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={entry.isFacelift ? 'font-mono text-2xl font-bold tabular-nums text-auto-accent-orange' : 'font-mono text-2xl font-bold tabular-nums text-neutral-900'}>
                            {entry.year}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {entry.isCurrent && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-auto-accent/15 text-auto-accent-strong border border-auto-accent/30 text-xs">
                                Actual
                              </span>
                            )}
                            {entry.isFacelift && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-auto-accent-orange/15 text-auto-accent-orange border border-auto-accent-orange/30 text-xs">
                                Facelift
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-neutral-500 sm:w-48 sm:text-right">
                          {entry.generation}
                        </div>
                      </div>
                      {entry.notes && (
                        <div className="mt-3 pt-3 border-t border-edge flex items-center gap-2 text-sm text-auto-accent-orange">
                          <span aria-hidden="true">⟳</span>
                          <span>{entry.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {generations.length > 0 && (
        <Reveal direction="up" delay={200}>
          <section aria-labelledby="generations-heading">
            <h2 id="generations-heading" className="mb-6 text-2xl font-bold text-neutral-900">Generaciones</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {generations.map((gen, index) => (
                <Reveal key={gen.number} direction="up" delay={index * 100}>
                  <div className="rounded-xl border border-edge bg-surface-card p-5 transition-colors hover:border-auto-accent/50">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-auto-accent">{gen.number === 1 ? '1ª' : `${gen.number}ª`}</span>
                      <span className="text-sm text-neutral-500">Generación</span>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">{gen.name}</h3>
                    <div className="space-y-1 text-sm text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden="true">📅</span>
                        <span>{gen.startYear}–{gen.endYear === 'presente' ? 'presente' : gen.endYear}</span>
                      </div>
                      {gen.faceliftYear && (
                        <div className="flex items-center gap-1.5 text-auto-accent-orange">
                          <span aria-hidden="true">⟳</span>
                          <span>Facelift en {gen.faceliftYear}</span>
                        </div>
                      )}
                      {gen.chassisCode && (
                        <div className="flex items-center gap-1.5">
                          <span aria-hidden="true">🏷️</span>
                          <span className="font-mono text-xs">{gen.chassisCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <Reveal direction="up" delay={300}>
        <section aria-labelledby="specs-heading">
          <h2 id="specs-heading" className="mb-6 text-2xl font-bold text-neutral-900">Evolución de especificaciones</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-edge text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="pb-3 px-4 sticky left-0 bg-surface-page z-10">Año</th>
                  <th className="pb-3 px-4">Potencia</th>
                  <th className="pb-3 px-4">Transmisión</th>
                  <th className="pb-3 px-4">Consumo</th>
                  <th className="pb-3 px-4">0-100 km/h</th>
                  <th className="pb-3 px-4">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {years.slice(0, 10).map((entry, index) => (
                  <tr key={entry.year} className={entry.isFacelift ? 'bg-auto-accent-orange/5' : ''}>
                    <td className={entry.isFacelift ? 'font-mono text-auto-accent-orange' : 'font-mono'}>
                      {entry.year}
                      {entry.isCurrent && <span className="ml-1 text-auto-accent text-xs">(actual)</span>}
                      {entry.isFacelift && <span className="ml-1 text-auto-accent-orange text-xs">★</span>}
                    </td>
                    <td className="py-3 px-4 text-neutral-900">{vehicle.power || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{vehicle.transmision || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{vehicle.consumo || '—'}</td>
                    <td className="py-3 px-4 text-neutral-500">{vehicle.performance?.acceleration || '—'}</td>
                    <td className="py-3 px-4 font-mono text-neutral-900">{vehicle.price || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-neutral-500">
              Mostrando los 10 años más recientes. Las especificaciones mostradas corresponden a la configuración actual del modelo; los valores históricos pueden variar por año.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal direction="up" delay={400}>
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
              href={`/fabricantes/${vehicle.manufacturer?.toLowerCase().replace(/\s+/g, '-')}`}
              className="inline-flex items-center gap-2 rounded-lg border border-auto-accent/35 bg-auto-accent/15 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-auto-accent-strong transition-colors hover:bg-auto-accent/25"
            >
              Ver fabricante {vehicle.manufacturer}
            </Link>
            <Link
              href={`/comparar?v=${encodeURIComponent(vehicle.slug)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-auto-accent/35 bg-auto-accent/15 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-auto-accent-strong transition-colors hover:bg-auto-accent/25"
            >
              Comparar con otros
            </Link>
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
  const history = await import('@/lib/vehicle-history').then(m => m.getModelYearHistory(vehicle))
  return { vehicle, image, history }
}

function createJsonLdItemList(vehicle: any, history: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Historial del ' + vehicle.title,
    description: 'Historial de años de modelo y evoluciones del ' + vehicle.title + ' desde ' + history.launchYear,
    itemListElement: history.years.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: vehicle.title + ' (' + entry.year + ')',
      description: entry.generation + (entry.isFacelift ? ' - Facelift' : '') + (entry.isCurrent ? ' (Modelo actual)' : ''),
      url: SITE_URL + '/vehiculos/' + vehicle.slug + '/historial#year-' + entry.year,
    }),
    numberOfItems: history.years.length,
  }
}

function createJsonLdBreadcrumb(vehicle: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Vehículos', item: SITE_URL + '/vehiculos' },
      { '@type': 'ListItem', position: 3, name: vehicle.title, item: SITE_URL + '/vehiculos/' + vehicle.slug },
      { '@type': 'ListItem', position: 4, name: 'Historial', item: SITE_URL + '/vehiculos/' + vehicle.slug + '/historial' },
    ],
  }
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
    .filter(v => {
      const hasHistory = v.anoProduccion?.includes('-') ||
        v.productionHistory?.generacionActual?.años ||
        v.generacionInfo?.faceliftAno !== null
      return hasHistory
    })
    .map(v => ({ slug: v.slug }))
}

export default async function VehicleHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const vehicle = await getEntity('vehiculos', slug)
  if (!vehicle) notFound()

  const image = resolveEntityDisplayImage(vehicle)
  const history = await import('@/lib/vehicle-history').then(m => m.getModelYearHistory(vehicle))

  const jsonLdItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Historial del ' + vehicle.title,
    description: 'Historial de años de modelo y evoluciones del ' + vehicle.title + ' desde ' + history.launchYear,
    itemListElement: history.years.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: vehicle.title + ' (' + entry.year + ')',
      description: entry.generation + (entry.isFacelift ? ' - Facelift' : '') + (entry.isCurrent ? ' (Modelo actual)' : ''),
      url: SITE_URL + '/vehiculos/' + vehicle.slug + '/historial#year-' + entry.year,
    }),
    numberOfItems: history.years.length,
  }

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Vehículos', item: SITE_URL + '/vehiculos' },
      { '@type': 'ListItem', position: 3, name: vehicle.title, item: SITE_URL + '/vehiculos/' + vehicle.slug },
      { '@type': 'ListItem', position: 4, name: 'Historial', item: SITE_URL + '/vehiculos/' + vehicle.slug + '/historial' },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Historial del ' + vehicle.title,
          description: 'Historial de años de modelo y evoluciones del ' + vehicle.title + ' desde ' + history.launchYear,
          itemListElement: history.years.map((entry, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: vehicle.title + ' (' + entry.year + ')',
            description: entry.generation + (entry.isFacelift ? ' - Facelift' : '') + (entry.isCurrent ? ' (Modelo actual)' : ''),
            url: SITE_URL + '/vehiculos/' + vehicle.slug + '/historial#year-' + entry.year,
          }),
          numberOfItems: history.years.length,
        }).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Vehículos', item: SITE_URL + '/vehiculos' },
            { '@type': 'ListItem', position: 3, name: vehicle.title, item: SITE_URL + '/vehiculos/' + vehicle.slug },
            { '@type': 'ListItem', position: 4, name: 'Historial', item: SITE_URL + '/vehiculos/' + vehicle.slug + '/historial' },
          ],
        }).replace(/</g, '\\u003c') }}
      />
      <VehicleHistoryClient vehicle={vehicle} history={history} />
    </>
  )
}