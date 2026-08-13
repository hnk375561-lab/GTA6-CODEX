import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getEntity, getEntitySlugs } from '@/lib/entities'
import { getRelatedEntities } from '@/lib/relations'
import { generateEntityMetadata, generateEntityJsonLd, generateBreadcrumbJsonLd } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface PageProps {
  params: Promise<{ entityType: string; slug: string }>
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
  const params: { entityType: string; slug: string }[] = []

  for (const type of Object.values(EntityType)) {
    const slugs = await getEntitySlugs(type)
    for (const slug of slugs) {
      params.push({ entityType: type, slug })
    }
  }

  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityType, slug } = await params
  if (!VALID_TYPES.includes(entityType)) return {}

  const entity = await getEntity(entityType as EntityType, slug)
  if (!entity) return {}

  return generateEntityMetadata(entity)
}

export default async function EntityPage({ params }: PageProps) {
  const { entityType, slug } = await params
  if (!VALID_TYPES.includes(entityType)) notFound()

  const type = entityType as EntityType
  const entity = await getEntity(type, slug)
  if (!entity) notFound()

  const related = await getRelatedEntities(entity, 8)
  const jsonLd = generateEntityJsonLd(entity)
  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: TYPE_LABELS[type], url: `/${type}` },
    { label: entity.title, url: `/${type}/${entity.slug}` },
  ])

  const statusLabel = STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Header */}
      <section className="border-b border-gta-border bg-gradient-to-b from-gta-card to-gta-dark py-10 sm:py-14">
        <div className="container-max">
          <nav className="mb-6 text-sm text-gta-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-gta-accent">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/${type}`} className="transition-colors hover:text-gta-accent">
              {TYPE_LABELS[type]}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gta-text">{entity.title}</span>
          </nav>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold text-gta-text sm:text-5xl">{entity.title}</h1>
            <Badge variant="status" status={entity.status}>
              {statusLabel}
            </Badge>
            {entity.featured && <Badge variant="tag">Destacado</Badge>}
          </div>

          <p className="max-w-3xl text-lg text-gta-text-secondary">{entity.description}</p>

          {entity.tags && entity.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {entity.tags.map((tag) => (
                <Badge key={tag} variant="tag">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="container-max grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {entity.content ? (
              <Card>
                <CardBody>
                  <div className="max-w-none">
                    {entity.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="mb-4 leading-relaxed text-gta-text-secondary last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody>
                  <p className="text-gta-text-secondary">
                    Todavía no hay contenido editorial extendido para esta entrada.
                  </p>
                </CardBody>
              </Card>
            )}
          </div>

          <aside className="space-y-6">
            {related.length > 0 && (
              <Card>
                <CardBody>
                  <h2 className="mb-4 font-bold text-gta-text">Relacionado</h2>
                  <ul className="space-y-3">
                    {related.map((r) => (
                      <li key={`${r.type}-${r.slug}`}>
                        <Link
                          href={`/${r.type}/${r.slug}`}
                          className="group flex flex-col text-sm transition-colors"
                        >
                          <span className="text-gta-text group-hover:text-gta-accent">
                            {r.title}
                          </span>
                          <span className="text-xs text-gta-text-secondary">
                            {TYPE_LABELS[r.type]}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody>
                <h2 className="mb-2 font-bold text-gta-text">Información</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gta-text-secondary">Categoría</dt>
                    <dd className="text-gta-text">{TYPE_LABELS[type]}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gta-text-secondary">Estado</dt>
                    <dd className="text-gta-text">{statusLabel}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gta-text-secondary">Actualizado</dt>
                    <dd className="text-gta-text">
                      {new Date(entity.updatedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </aside>
        </div>
      </section>
    </>
  )
}
