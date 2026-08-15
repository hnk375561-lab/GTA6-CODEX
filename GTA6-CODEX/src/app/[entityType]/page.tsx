import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { generateListMetadata } from '@/lib/seo'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EntityListExplorer } from '@/components/entities/EntityListExplorer'

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

  const statusCounts = { confirmado: 0, rumor: 0, nuestro: 0 } as Record<
    keyof typeof STATUS_LABELS,
    number
  >
  for (const e of entities) {
    const key = e.status as keyof typeof STATUS_LABELS
    if (key in statusCounts) statusCounts[key] += 1
  }

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

        <EntityListExplorer type={type} entities={entities} typeLabel={label} />
      </div>
    </section>
  )
}
