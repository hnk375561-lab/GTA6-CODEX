import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType, type Trailer } from '@/types'
import { getEntity, getEntitySlugs } from '@/lib/entities'
import { getMediaForTrailer, resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelatedEntitiesWithLabel } from '@/lib/relations'
import { generateEntityMetadata, generateEntityJsonLd, generateBreadcrumbJsonLd } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { EvidenceBlock } from '@/components/entities/EvidenceBlock'
import { EntityMetadata } from '@/components/entities/EntityMetadata'
import { RelationsPanel } from '@/components/entities/RelationsPanel'
import { EntityHeaderBackground } from '@/components/entities/EntityHeaderBackground'
import { EntitySectionHeading } from '@/components/entities/EntitySectionHeading'
import { EntityImage } from '@/components/entities/EntityImage'
import { TrailerScenes } from '@/components/entities/TrailerScenes'
import { TrailerStats } from '@/components/entities/TrailerStats'
import { EntityNav } from '@/components/entities/EntityNav'
import { TrailerPlayer } from '@/components/media/TrailerPlayer'
import { MediaCarousel } from '@/components/media/MediaCarousel'
import { getMediaForEntity } from '@/lib/media'
import { ENTITY_IMAGE_CATEGORIES } from '@/lib/images'
import { MagicCard } from '@/components/ui/MagicCard'
import { SceneSection } from '@/components/webgl/SceneSection'
import { EntityAtmosphereBridge } from '@/components/webgl/EntityAtmosphereBridge'

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
  [EntityType.TRAILER]: 'Trailers',
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
  [EntityType.TRAILER]: 'Material Oficial · Archivo',
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

  // Retrato propio de la entidad para OG/Twitter cards (antes esta función
  // no lo resolvía y generateEntityMetadata caía siempre al og-image.png
  // genérico del sitio, aunque la entidad ya tuviera imagen propia).
  return generateEntityMetadata(entity, resolveEntityDisplayImage(entity))
}

export default async function EntityPage({ params }: PageProps) {
  const { entityType, slug } = await params
  if (!VALID_TYPES.includes(entityType)) notFound()

  const type = entityType as EntityType
  const entity = await getEntity(type, slug)
  if (!entity) notFound()

  const related = await getBidirectionalRelatedEntitiesWithLabel(entity, 8)
  // Media relacionada (clips de personaje, trailers donde aparece, retratos
  // de entidades vinculadas). Se filtra el propio retrato de la entidad
  // (id `entity-portrait-{type}-{slug}`) porque ya se muestra aparte vía
  // `EntityImage` más abajo — el carrusel es "lo demás", no un duplicado.
  const relatedMedia = getMediaForEntity(entity).filter(
    (asset) => asset.id !== `entity-portrait-${type}-${entity.slug}`
  )
  const jsonLd = generateEntityJsonLd(
    entity,
    type === EntityType.TRAILER ? getMediaForTrailer(entity.slug) : null
  )
  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: TYPE_LABELS[type], url: `/${type}` },
    { label: entity.title, url: `/${type}/${entity.slug}` },
  ])

  const statusLabel = STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status
  const classificationLabel =
    CLASSIFICATION_LABELS[type] ?? `Expediente · ${TYPE_LABELS[type]}`

  // Índices editoriales de sección: solo cuentan secciones que realmente
  // se van a renderizar, para que la numeración nunca muestre saltos
  // (ej. "01" seguido de "03" si Evidencia no existe para esta entidad).
  const hasEvidence = Boolean(entity.evidence)
  const hasRelated = related.length > 0
  let sectionCounter = 0
  const evidenceIndex = hasEvidence ? ++sectionCounter : undefined
  const relatedIndex = hasRelated ? ++sectionCounter : undefined
  const infoIndex = ++sectionCounter

  const headerContent = (
    <>
      <nav
        className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-gta-text-secondary animate-fade-in"
        aria-label="Breadcrumb"
      >
        <div>
          <Link href="/" className="link-underline transition-colors hover:text-gta-accent">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/${type}`} className="link-underline transition-colors hover:text-gta-accent">
            {TYPE_LABELS[type]}
          </Link>
          <span className="mx-2">/</span>
          <span className="inline-block max-w-[50vw] truncate align-bottom text-gta-text sm:max-w-none">
            {entity.title}
          </span>
        </div>
        <code className="hidden shrink-0 font-mono text-[11px] text-gta-text-secondary/80 sm:inline-block">
          {type}/{entity.slug}
        </code>
      </nav>

      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gta-accent/80">
        <span className="h-px w-4 bg-gta-accent/40" aria-hidden="true" />
        {classificationLabel}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold text-gta-text sm:text-5xl">{entity.title}</h1>
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

      {/* Publica categoría/estado/featured de esta ficha al motor WebGL.
          No renderiza nada — ver EntityAtmosphereBridge. */}
      <EntityAtmosphereBridge category={type} status={entity.status} featured={Boolean(entity.featured)} />

      {/* Header — el fondo ambiental por categoría (EntityHeaderBackground) se
          mantiene siempre: es identidad visual de bajo costo (CSS/SVG, sin JS).
          El orb interactivo que sigue al cursor (MagicCard) queda reservado a
          entidades `featured`, que es exactamente lo que el comentario del
          componente ya decía pero el código no respetaba — el resto usa un
          contenedor estático, sin efecto de seguimiento de puntero. */}
      <SceneSection
        sceneId="entity-header"
        className="relative overflow-hidden border-b border-gta-border bg-gradient-to-b from-gta-card to-gta-dark py-10 sm:py-14"
      >
        <EntityHeaderBackground type={type} />
        <div className="container-max relative">
          <span
            className="pointer-events-none absolute -left-1 -top-1 hidden h-5 w-5 border-l border-t border-gta-accent/25 sm:block"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -bottom-1 -right-1 hidden h-5 w-5 border-b border-r border-gta-accent-orange/20 sm:block"
            aria-hidden="true"
          />
          {entity.featured ? (
            <MagicCard
              mode="orb"
              glowFrom="#ff2f8f"
              glowTo="#22d3ee"
              glowSize={340}
              glowBlur={90}
              glowOpacity={0.25}
              className="p-6 sm:p-8"
            >
              {headerContent}
            </MagicCard>
          ) : (
            <div className="rounded-lg border border-gta-border bg-gta-surface/60 p-6 sm:p-8">
              {headerContent}
            </div>
          )}
        </div>
      </SceneSection>

      {/* Content */}
      <SceneSection sceneId="entity-content" className="py-12 sm:py-16">
        <div className="container-max">
          {type === EntityType.TRAILER && 'scenes' in entity && (
            <Reveal className="mb-10">
              <TrailerStats trailer={entity as Trailer} />
            </Reveal>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {type === EntityType.TRAILER && 'scenes' in entity && (
              <Reveal direction="left">
                <TrailerPlayer trailer={entity as Trailer} />
              </Reveal>
            )}
            {type === EntityType.TRAILER && 'scenes' in entity && (
              <Reveal direction="left">
                <TrailerScenes trailer={entity as Trailer} />
              </Reveal>
            )}
            {entity.content ? (
              <Reveal direction="left">
                <Card className={entity.featured ? 'shadow-gta-sm border-gta-accent/30' : 'shadow-gta-sm'}>
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
                <Card className="shadow-gta-sm">
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
            {ENTITY_IMAGE_CATEGORIES.includes(type) && (
              <Reveal direction="right">
                <EntityImage entity={entity} image={resolveEntityDisplayImage(entity)} variant="portrait" />
              </Reveal>
            )}

            {relatedMedia.length > 0 && (
              <Reveal direction="right" delay={40}>
                <MediaCarousel title="Contenido audiovisual" assets={relatedMedia} />
              </Reveal>
            )}

            {entity.evidence && (
              <Reveal direction="right">
                <Card className="shadow-gta-sm">
                  <CardBody>
                    <EntitySectionHeading label="Evidencia" index={evidenceIndex} />
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
                <Card className="shadow-gta-sm">
                  <CardBody>
                    <EntitySectionHeading label="Relacionado" index={relatedIndex} />
                    <RelationsPanel related={related} />
                  </CardBody>
                </Card>
              </Reveal>
            )}

            <Reveal direction="right" delay={220}>
              <Card className="shadow-gta-sm">
                <CardBody>
                  <EntitySectionHeading label="Información" index={infoIndex} />
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

          <Reveal className="mt-12">
            <EntityNav type={type} currentSlug={entity.slug} />
          </Reveal>
        </div>
      </SceneSection>
    </>
  )
}
