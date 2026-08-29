import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { EntityType, type Entity } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateListMetadata } from '@/lib/seo'
import { getVehiclesByManufacturer } from '@/lib/vehicle-manufacturers'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Card, CardBody } from '@/components/ui/Card'
import { EntityListExplorer } from '@/components/entities/EntityListExplorer'
import { EntityCard } from '@/components/entities/EntityCard'

interface PageProps {
  params: Promise<{ entityType: string }>
}

/**
 * Fallback del `Suspense` que envuelve `EntityListExplorer` (necesario
 * porque ese componente usa `useSearchParams` para sincronizar filtros
 * con la URL). Este fallback es lo que efectivamente queda en el HTML
 * generado estáticamente hasta que React hidrata — por eso reproduce la
 * grilla real de entidades (sin buscador/filtros interactivos) en vez de
 * un simple "Cargando…", para no perder contenido indexable ni mostrar
 * una pantalla vacía antes de la hidratación.
 */
function EntityListExplorerFallback({
  entities,
  typeLabel,
  imageBySlug,
}: {
  entities: Entity[]
  typeLabel: string
  imageBySlug: ReturnType<typeof getEntityImageMap>
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity, index) => (
        <div key={`${entity.type}-${entity.slug}`} className="entity-card-viewport">
          <EntityCard
            entity={entity}
            typeLabel={typeLabel}
            image={imageBySlug[`${entity.type}/${entity.slug}`]}
            // Las primeras 4 cards son las que típicamente están visibles
            // sin scroll (1-2 columnas en mobile, hasta 3 en desktop) —
            // ver docs/audit-performance-2026-08.md sección 3. Solo esas
            // piden priority; el resto sigue lazy como antes.
            priority={index < 4}
          />
        </div>
      ))}
    </div>
  )
}

const VALID_TYPES = Object.values(EntityType) as string[]

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
}

const STATUS_LABELS = {
  confirmado: 'Confirmado',
  rumor: 'Rumor',
  nuestro: 'Nuestro',
} as const

export async function generateStaticParams() {
  return Object.values(EntityType).map((type) => ({ entityType: type }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityType } = await params
  if (!VALID_TYPES.includes(entityType)) return {}
  const entities = await getEntitiesByType(entityType as EntityType)
  return generateListMetadata(entityType as EntityType, entities.length)
}

export default async function EntityTypePage({ params }: PageProps) {
  const { entityType } = await params
  if (!VALID_TYPES.includes(entityType)) notFound()

  const type = entityType as EntityType
  const entities = await getEntitiesByType(type)
  const label = TYPE_LABELS[type]

  // Conteo de conexiones incluyendo relaciones inferidas/bidireccionales
  // (Fase 8, hallazgo [7]): se resuelve una sola vez acá, en servidor —
  // EntityListExplorer/EntityCard son 'use client' y no pueden recorrer
  // todo el contenido por su cuenta. Mismo patrón que imageBySlug.
  const relationCountEntries = await Promise.all(
    entities.map(async (e) => [e.slug, await getBidirectionalRelationCount(e)] as const)
  )
  const relationCountBySlug = Object.fromEntries(relationCountEntries)

  const statusCounts = { confirmado: 0, rumor: 0, nuestro: 0 } as Record<
    keyof typeof STATUS_LABELS,
    number
  >
  for (const e of entities) {
    const key = e.status as keyof typeof STATUS_LABELS
    if (key in statusCounts) statusCounts[key] += 1
  }

  const vehicleManufacturerGroups = type === EntityType.VEHICLE ? await getVehiclesByManufacturer() : null
  const entityImageMap = getEntityImageMap(entities)

  return (
    <section className="relative overflow-hidden border-b border-auto-border py-12 sm:py-16">
      <div className="list-header-glow" aria-hidden="true" />
      <div className="container-max relative">
        <Reveal className="mb-10">
          <nav className="mb-6 text-sm text-auto-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-auto-text">{label}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="category-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-auto-accent">
              <CategoryIcon type={type} className="h-6 w-6" />
            </div>
            <div>
              {/* Mismo patrón eyebrow→heading que cada sección del home
                  (Categorías, Destacados) — antes esta página era la única
                  que saltaba directo al h1 sin ese primer escalón, así que
                  el título no se leía como parte del mismo sistema. */}
              <p className="eyebrow mb-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-auto-accent">
                Catálogo
              </p>
              <h1 className="text-4xl font-bold leading-tight text-auto-text">{label}</h1>
              {/* text-sm (antes heredaba el tamaño base de <p>): la metadata
                  de conteo es información de apoyo, no debería competir en
                  peso visual con el h1 que tiene justo arriba. */}
              <p className="mt-2 text-sm text-auto-text-secondary">
                {entities.length} {entities.length === 1 ? 'entrada documentada' : 'entradas documentadas'}
                {entities.length > 0 && (
                  <span className="text-auto-text-secondary/80">
                    {' · '}
                    {[
                      statusCounts.confirmado > 0 && `${statusCounts.confirmado} ${STATUS_LABELS.confirmado.toLowerCase()}`,
                      statusCounts.rumor > 0 && `${statusCounts.rumor} ${STATUS_LABELS.rumor.toLowerCase()}`,
                      statusCounts.nuestro > 0 && `${statusCounts.nuestro} ${STATUS_LABELS.nuestro.toLowerCase()}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Índice de fabricantes (roadmap punto 4, agregación por
            atributo): solo en el listado de Vehículos, único tipo con
            `manufacturer` en su schema. Enlaza a las páginas hub en
            /vehiculos/fabricante/[manufacturer], que de otro modo
            quedarían sin descubrimiento interno. */}
        {type === EntityType.VEHICLE && (
          <Reveal className="mb-10">
            {(() => {
              const groups = Array.from(vehicleManufacturerGroups!.values()).sort(
                (a, b) => b.vehicles.length - a.vehicles.length
              )
              return (
                <Card>
                  <CardBody>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-auto-text-secondary">
                      Explorar por fabricante
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {groups.map((group) => (
                        <Link
                          key={group.slug}
                          href={`/vehiculos/fabricante/${group.slug}`}
                          className="rounded-full border border-auto-border px-3 py-1.5 text-sm text-auto-text-secondary transition-colors hover:border-auto-accent hover:text-auto-accent"
                        >
                          {group.label}
                          <span className="ml-1.5 text-auto-text-secondary/80">{group.vehicles.length}</span>
                        </Link>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )
            })()}
          </Reveal>
        )}

        {/* Suspense requerido por `useSearchParams` dentro de
            EntityListExplorer (sincroniza filtros con la URL, ver
            `useSyncedSearchParams`) — sin este boundary, Next.js
            desoptimiza la generación estática de toda la ruta en vez de
            solo este subárbol. El fallback reproduce el layout sin
            interactividad para que no haya salto de layout mientras
            hidrata. */}
        {entities.length === 0 ? (
          // Mismo patrón visual que /mapa (única otra sección "en
          // construcción" del sitio): encabezado + párrafo centrados, sin
          // inventar un estilo nuevo. Antes de esto, Noticias y Guías no
          // mostraban nada bajo el h1 — un grid vacío sin ninguna
          // explicación, indistinguible de una página rota.
          <Reveal>
            <div className="mx-auto max-w-2xl py-16 text-center md:py-24">
              <h2 className="font-display text-2xl font-bold text-auto-text md:text-3xl">
                {label} en construcción
              </h2>
              <p className="mt-4 text-auto-text-secondary">
                Esta sección ya está lista en el código — todavía no publicamos{' '}
                {type === EntityType.NEWS ? 'la primera noticia real' : 'la primera guía real'}.
              </p>
            </div>
          </Reveal>
        ) : (
          <Suspense fallback={<EntityListExplorerFallback entities={entities} typeLabel={label} imageBySlug={entityImageMap} />}>
            <EntityListExplorer
              type={type}
              entities={entities}
              typeLabel={label}
              imageBySlug={entityImageMap}
              relationCountBySlug={relationCountBySlug}
            />
          </Suspense>
        )}
      </div>
    </section>
  )
}
