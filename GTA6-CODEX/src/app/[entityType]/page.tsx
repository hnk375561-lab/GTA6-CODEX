import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { generateListMetadata } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

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
        <div className="mb-10">
          <nav className="mb-4 text-sm text-gta-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-gta-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gta-text">{TYPE_LABELS[type]}</span>
          </nav>
          <h1 className="mb-2 text-4xl font-bold text-gta-text">{TYPE_LABELS[type]}</h1>
          <p className="text-gta-text-secondary">
            {entities.length} {entities.length === 1 ? 'entrada documentada' : 'entradas documentadas'}
          </p>
        </div>

        {entities.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-gta-text-secondary">
                Todavía no hay contenido publicado en esta categoría. ¡Vuelve pronto!
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entities.map((entity) => (
              <Link key={entity.slug} href={`/${type}/${entity.slug}`} className="group">
                <Card hoverable className="h-full">
                  <CardBody>
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
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
