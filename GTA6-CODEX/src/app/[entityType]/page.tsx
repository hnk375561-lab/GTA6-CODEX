import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { generateListMetadata } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { EntityImage } from '@/components/entities/EntityImage'
import { ENTITY_IMAGE_CATEGORIES } from '@/lib/images'

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

  return (
    <section className="py-12 sm:py-16">
      <div className="container-max">
        <Reveal className="mb-10">
          <nav className="mb-4 text-sm text-gta-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="link-underline transition-colors hover:text-gta-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gta-text">{TYPE_LABELS[type]}</span>
          </nav>
          <h1 className="mb-2 text-4xl font-bold text-gta-text">{TYPE_LABELS[type]}</h1>
          <p className="text-gta-text-secondary">
            {entities.length} {entities.length === 1 ? 'entrada documentada' : 'entradas documentadas'}
          </p>
        </Reveal>

        {entities.length === 0 ? (
          <div className="rounded-lg border border-gta-border bg-gta-surface px-6 py-10 text-center">
            <p className="mb-1 font-semibold text-gta-text">
              Todavía no hay {TYPE_LABELS[type].toLowerCase()} documentados
            </p>
            <p className="mb-4 text-sm text-gta-text-secondary">
              Esta categoría está vacía por ahora — estamos incorporando contenido a medida que se
              confirma. Volvé pronto.
            </p>
            <Link href="/" className="text-sm font-semibold text-gta-accent hover:underline">
              Explorar otras categorías
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entities.map((entity, i) => (
              <Reveal key={entity.slug} delay={(i % 6) * 80}>
                <Link href={`/${type}/${entity.slug}`} className="group block h-full">
                  <Card
                    hoverable
                    className={`h-full overflow-hidden ${
                      ENTITY_IMAGE_CATEGORIES.includes(type) ? '!p-0' : ''
                    }`}
                  >
                    {ENTITY_IMAGE_CATEGORIES.includes(type) && (
                      <EntityImage entity={entity} variant="thumbnail" className="rounded-none border-x-0 border-t-0" />
                    )}
                    <CardBody className={ENTITY_IMAGE_CATEGORIES.includes(type) ? 'p-6' : undefined}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <Badge variant="status" status={entity.status}>
                          {STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status}
                        </Badge>
                        {entity.featured && <Badge variant="tag">Destacado</Badge>}
                      </div>
                      <h2 className="mb-2 text-xl font-bold text-gta-text transition-colors group-hover:text-gta-accent">
                        {entity.title}
                      </h2>
                      <p className="line-clamp-3 text-sm text-gta-text-secondary">
                        {entity.description}
                      </p>
                    </CardBody>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
