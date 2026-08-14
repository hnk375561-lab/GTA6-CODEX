import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getEntity, getEntitySlugs } from '@/lib/entities'
import { getRelatedEntitiesWithLabel } from '@/lib/relations'
import { generateEntityMetadata, generateEntityJsonLd, generateBreadcrumbJsonLd } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { AnimatedText } from '@/components/ui/AnimatedText'
import { EvidenceBlock } from '@/components/entities/EvidenceBlock'
import { EntityMetadata } from '@/components/entities/EntityMetadata'
import { RelationsPanel } from '@/components/entities/RelationsPanel'
import { EntityHeaderBackground } from '@/components/entities/EntityHeaderBackground'
import { MagicCard } from '@/components/ui/MagicCard'
import { ShineBorder } from '@/components/ui/ShineBorder'

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

/**
 * Eyebrow editorial de clasificación (sección "CLASSIFICATION / <TIPO>" del
 * dossier). Las 5 categorías núcleo del sitio reciben un par semántico
 * propio; el resto cae a un fallback genérico "EXPEDIENTE · <TIPO>" en vez
 * de multiplicar variantes.
 */
const CLASSIFICATION_LABELS: Partial<Record<EntityType, string>> = {
  [EntityType.CHARACTER]: 'Identidad · Dossier',
  [EntityType.LOCATION]: 'Territorio · Ubicación',
  [EntityType.FACTION]: 'Organización · Autoridad',
  [EntityType.BUSINESS]: 'Negocio · Establecimiento',
  [EntityType.VEHICLE]: 'Vehículo · Fabricante',
}

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

  const related = await getRelatedEntitiesWithLabel(entity, 8)
  const jsonLd = generateEntityJsonLd(entity)
  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: TYPE_LABELS[type], url: `/${type}` },
    { label: entity.title, url: `/${type}/${entity.slug}` },
  ])

  const statusLabel = STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status
  const classificationLabel =
    CLASSIFICATION_LABELS[type] ?? `Expediente · ${TYPE_LABELS[type]}`

  const headerContent = (
    <>
      <nav className="mb-6 text-sm text-gta-text-secondary animate-fade-in" aria-label="Breadcrumb">
        <Link href="/" className="link-underline transition-colors hover:text-gta-accent">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${type}`} className="link-underline transition-colors hover:text-gta-accent">
          {TYPE_LABELS[type]}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gta-text">{entity.title}</span>
      </nav>

      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gta-accent/80">
        <span className="h-px w-4 bg-gta-accent/40" aria-hidden="true" />
        {classificationLabel}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold text-gta-text sm:text-5xl">
          <AnimatedText text={entity.title} mode="words" stagger={60} />
        </h1>
        <Badge variant="status" status={entity.status}>
          {statusLabel}
        </Badge>
        {entity.featured && <Badge variant="tag">Destacado</Badge>}
      </div>

      <Reveal delay={200}>
        <p className="max-w-3xl text-lg text-gta-text-secondary">{entity.description}</p>
      </Reveal>

      {entity.tags && entity.tags.length > 0 && (
        <div className="stagger mt-5 flex flex-wrap gap-2">
          {entity.tags.map((tag) => (
            <Badge key={tag} variant="tag">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </>
  )

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

      {/* Header — todo ficha es "el hero de su propia ficha" (Nivel 3 del
          sistema de motion), así que el fondo cinematográfico por categoría
          y el MagicCard con glow ambiental aplican siempre. Las entidades
          "featured" (contenido seleccionado editorialmente, no una medida
          de importancia visual) suman únicamente un glow algo más presente
          y el ShineBorder en la card de contenido — un acento extra, no un
          interruptor de "modo premium". */}
      <section className="relative overflow-hidden border-b border-gta-border bg-gradient-to-b from-gta-card to-gta-dark py-10 sm:py-14">
        <EntityHeaderBackground type={type} />
        <div className="container-max relative">
          <MagicCard
            mode="orb"
            glowFrom="#ff6600"
            glowTo="#00d000"
            glowSize={entity.featured ? 380 : 320}
            glowBlur={90}
            glowOpacity={entity.featured ? 0.35 : 0.22}
            className="p-6 sm:p-8"
          >
            {headerContent}
          </MagicCard>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="container-max grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {entity.content ? (
              <Reveal direction="left">
                <Card className={entity.featured ? 'relative' : undefined}>
                  {entity.featured && (
                    <ShineBorder shineColor={['#00d000', '#ff6600']} borderWidth={1} duration={16} />
                  )}
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
              </Reveal>
            ) : (
              <Reveal direction="left">
                <Card>
                  <CardBody>
                    <p className="text-gta-text-secondary">
                      Todavía no hay contenido editorial extendido para esta entrada.
                    </p>
                  </CardBody>
                </Card>
              </Reveal>
            )}
          </div>

          <aside className="space-y-6">
            {entity.evidence && (
              <Reveal direction="right">
                <Card>
                  <CardBody>
                    <h2 className="mb-3 font-bold text-gta-text">Evidencia</h2>
                    <EvidenceBlock evidence={entity.evidence} />
                  </CardBody>
                </Card>
              </Reveal>
            )}

            <Reveal direction="right" delay={80}>
              <EntityMetadata entity={entity} />
            </Reveal>

            {related.length > 0 && (
              <Reveal direction="right" delay={150}>
                <Card>
                  <CardBody>
                    <h2 className="mb-4 font-bold text-gta-text">Relacionado</h2>
                    <RelationsPanel related={related} />
                  </CardBody>
                </Card>
              </Reveal>
            )}

            <Reveal direction="right" delay={220}>
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
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  )
}
