import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { getCoverArtVideoAsset, resolveMediaRender, getCharacterClipUrl, getEntityImageMap } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateListMetadata } from '@/lib/seo'
import { getVehiclesByManufacturer } from '@/lib/vehicle-manufacturers'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Card, CardBody } from '@/components/ui/Card'
import { EntityListExplorer } from '@/components/entities/EntityListExplorer'
import { VideoEmbed } from '@/components/media/VideoEmbed'

interface PageProps {
  params: Promise<{ entityType: string }>
}

const VALID_TYPES = Object.values(EntityType) as string[]

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.CHARACTER]: 'Personajes',
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.LOCATION]: 'Ubicaciones',
  [EntityType.MISSION]: 'Misiones',
  [EntityType.WEAPON]: 'Armas',
  [EntityType.ACTIVITY]: 'Actividades',
  [EntityType.FACTION]: 'Organizaciones',
  [EntityType.BUSINESS]: 'Negocios',
  [EntityType.OBJECT]: 'Objetos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
  [EntityType.TRAILER]: 'Trailers',
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

  return (
    <section className="relative overflow-hidden border-b border-gta-border py-12 sm:py-16">
      <div className="list-header-glow" aria-hidden="true" />
      <div className="container-max relative">
        <Reveal className="mb-10">
          <nav className="mb-4 text-sm text-gta-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-gta-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gta-text">{label}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="category-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-gta-accent">
              <CategoryIcon type={type} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gta-text">{label}</h1>
              <p className="mt-1 text-gta-text-secondary">
                {entities.length} {entities.length === 1 ? 'entrada documentada' : 'entradas documentadas'}
                {entities.length > 0 && (
                  <span className="text-gta-text-secondary/60">
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

        {/* Portada oficial en video: solo en el listado de Trailers, no
            reemplaza ningún contenido existente — se agrega arriba del
            explorador de la lista. */}
        {type === EntityType.TRAILER && getCoverArtVideoAsset() && (
          <Reveal className="mb-10">
            {(() => {
              const coverArt = resolveMediaRender(getCoverArtVideoAsset()!)
              return (
                <Card className="overflow-hidden !p-0">
                  <VideoEmbed videoSrc={coverArt.videoSrc!} title={coverArt.title} className="!rounded-none !border-0" />
                  <CardBody>
                    <p className="text-sm text-gta-text-secondary">{coverArt.title}</p>
                  </CardBody>
                </Card>
              )
            })()}
          </Reveal>
        )}

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
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gta-text-secondary">
                      Explorar por fabricante
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {groups.map((group) => (
                        <Link
                          key={group.slug}
                          href={`/vehiculos/fabricante/${group.slug}`}
                          className="rounded-full border border-gta-border px-3 py-1.5 text-sm text-gta-text-secondary transition-colors hover:border-gta-accent hover:text-gta-accent"
                        >
                          {group.label}
                          <span className="ml-1.5 text-gta-text-secondary/60">{group.vehicles.length}</span>
                        </Link>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )
            })()}
          </Reveal>
        )}

        <EntityListExplorer
          type={type}
          entities={entities}
          typeLabel={label}
          imageBySlug={getEntityImageMap(entities)}
          relationCountBySlug={relationCountBySlug}
          clipUrlBySlug={
            type === EntityType.CHARACTER
              ? Object.fromEntries(
                  entities
                    .map((e) => [e.slug, getCharacterClipUrl(e.slug)] as const)
                    .filter((pair): pair is [string, string] => Boolean(pair[1]))
                )
              : undefined
          }
        />
      </div>
    </section>
  )
}
