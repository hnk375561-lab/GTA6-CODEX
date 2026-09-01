import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { getEntity, getEntitySlugs, getEntitiesByType } from '@/lib/entities'
import { resolveEntityDisplayImage, resolveEntityDisplayImages } from '@/lib/media'
import { getBidirectionalRelatedEntitiesWithLabel } from '@/lib/relations'
import { getSimilarVehicles } from '@/lib/vehicle-similar'
import { getVehicleCategory, categoryPageHref, categoryToSlug } from '@/lib/vehicle-category'
import { getManufacturerStats } from '@/lib/manufacturer-stats'
import { SimilarVehiclesPanel } from '@/components/entities/SimilarVehiclesPanel'
import { generateEntityMetadata, generateEntityJsonLd, generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { EvidenceBlock } from '@/components/entities/EvidenceBlock'
import { EntityMetadata } from '@/components/entities/EntityMetadata'
import { RelationsPanel } from '@/components/entities/RelationsPanel'
import { EntityHeaderBackground } from '@/components/entities/EntityHeaderBackground'
import { EntitySectionHeading } from '@/components/entities/EntitySectionHeading'
import { EntityImage } from '@/components/entities/EntityImage'
import { EntityGallery } from '@/components/entities/EntityGallery'
import { EntityContent } from '@/components/entities/EntityContent'
import { EntityNav } from '@/components/entities/EntityNav'
import { MediaCarousel } from '@/components/media/MediaCarousel'
import { getMediaForEntity } from '@/lib/media'
import { ENTITY_IMAGE_CATEGORIES } from '@/lib/images'
import { SceneSection } from '@/components/webgl/SceneSection'
import { AdUnit } from '@/components/monetization/AdUnit'
import { OlxAffiliateButton } from '@/components/monetization/OlxAffiliateButton'
import { MercadoLibreAffiliateButton } from '@/components/monetization/MercadoLibreAffiliateButton'

interface PageProps {
  params: Promise<{ entityType: string; slug: string }>
}

const VALID_TYPES = Object.values(EntityType) as string[]

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
  [EntityType.MANUFACTURER]: 'Fabricantes',
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
  [EntityType.VEHICLE]: 'Vehículo · Fabricante',
  [EntityType.MANUFACTURER]: 'Fabricante · Empresa',
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

  // Tope de 8 relacionados salvo para Fabricantes: un fabricante con más
  // de 8 vehículos (8 casos hoy — Honda 16, Toyota 15, etc.) perdía
  // unidades reales en su propia ficha bajo el cap genérico pensado para
  // paneles de "contenido relacionado" con volumen bajo. `relations[]`
  // de Manufacturer ya cubre el 100% de sus vehículos (confirmado 1:1
  // contra `vehicle.manufacturer`, #9 audit), así que mostrar todo acá no
  // es un riesgo de dato inventado — es la fuente completa.
  const relatedLimit = type === EntityType.MANUFACTURER ? undefined : 8
  const related = await getBidirectionalRelatedEntitiesWithLabel(entity, relatedLimit)
  // Media relacionada (clips de personaje, trailers donde aparece, retratos
  // de entidades vinculadas). Se filtra el propio retrato de la entidad
  // (id `entity-portrait-{type}-{slug}`) porque ya se muestra aparte vía
  // `EntityImage` más abajo — el carrusel es "lo demás", no un duplicado.
  const relatedMedia = getMediaForEntity(entity).filter(
    (asset) => asset.id !== `entity-portrait-${type}-${entity.slug}`
  )
  // Galería multi-imagen (FASE 9, punto 2): [] para el caso normal de 0/1
  // imagen (236 vehículos hoy) — ahí el render de abajo sigue usando
  // `EntityImage` exactamente como antes, sin cambio de comportamiento.
  const galleryImages = ENTITY_IMAGE_CATEGORIES.includes(type) ? resolveEntityDisplayImages(entity) : []
  // Vehículos similares (oportunidad #6 del audit, desbloqueada por
  // `category` — ver vehicle-category.ts, FASE 5). Exclusivo de Vehículo:
  // el criterio (misma categoría amplia + cercanía de potencia) no
  // tiene equivalente para Fabricante/Noticia/Guía. Se excluyen los
  // slugs que ya aparecen en `related` (mismo_fabricante/competidor)
  // para no mostrar la misma entidad dos veces en la misma página.
  const similarVehicles =
    type === EntityType.VEHICLE
      ? getSimilarVehicles(
          entity as Vehicle,
          (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[],
          { excludeSlugs: new Set(related.map((r) => r.entity.slug)) }
        )
      : []
  const hasSimilar = similarVehicles.length > 0

  // Agregados derivados de fabricante (FASE 7, punto 2): total de
  // modelos, rango de potencia, rango de años, categorías presentes y
  // modelos destacados. Exclusivo de Fabricante — `getManufacturerStats`
  // ya devuelve todo en null/vacío si no hay datos, nunca 0/null
  // engañoso mezclado con datos reales.
  const manufacturerStats =
    type === EntityType.MANUFACTURER
      ? getManufacturerStats(entity.slug, (await getEntitiesByType(EntityType.VEHICLE)) as Vehicle[])
      : null

  const jsonLd = generateEntityJsonLd(entity, null)
  const breadcrumbLd = generateBreadcrumbJsonLd([
    { label: 'Inicio', url: '/' },
    { label: TYPE_LABELS[type], url: `/${type}` },
    { label: entity.title, url: `/${type}/${entity.slug}` },
  ])

  const statusLabel = STATUS_LABELS[entity.status as keyof typeof STATUS_LABELS] || entity.status
  const classificationLabel =
    CLASSIFICATION_LABELS[type] ?? `Expediente · ${TYPE_LABELS[type]}`
  // Link a la página de categoría (FASE 6, Gap 2): las 250 fichas de
  // vehículo eran el enlace interno que faltaba hacia `/categorias/
  // [grupo]` — hoy esas páginas no tenían ningún link apuntándoles más
  // que el propio sitemap. `categoryPageHref` ya devuelve `null` si el
  // vehículo no tiene `class` documentada o su categoría es 'Otros'
  // (bucket residual sin página SEO propia), así que nunca se linkea a
  // una ruta que respondería 404.
  const vehicleCategory = type === EntityType.VEHICLE ? getVehicleCategory((entity as Vehicle).class) : null
  const categoryHref = type === EntityType.VEHICLE ? categoryPageHref((entity as Vehicle).class) : null

  // Índices editoriales de sección: solo cuentan secciones que realmente
  // se van a renderizar, para que la numeración nunca muestre saltos
  // (ej. "01" seguido de "03" si Evidencia no existe para esta entidad).
  const hasEvidence = Boolean(entity.evidence)
  const hasRelated = related.length > 0
  let sectionCounter = 0
  const evidenceIndex = hasEvidence ? ++sectionCounter : undefined
  const relatedIndex = hasRelated ? ++sectionCounter : undefined
  const similarIndex = hasSimilar ? ++sectionCounter : undefined
  const infoIndex = ++sectionCounter

  const headerContent = (
    <>
      <nav
        className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-auto-text-secondary animate-fade-in"
        aria-label="Breadcrumb"
      >
        <div>
          <Link href="/" className="link-underline transition-colors hover:text-auto-accent">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/${type}`} className="link-underline transition-colors hover:text-auto-accent">
            {TYPE_LABELS[type]}
          </Link>
          <span className="mx-2">/</span>
          <span className="inline-block max-w-[50vw] truncate align-bottom text-auto-text sm:max-w-none">
            {entity.title}
          </span>
        </div>
        <code className="hidden shrink-0 font-mono text-[11px] text-auto-text-secondary/80 sm:inline-block">
          {type}/{entity.slug}
        </code>
      </nav>

      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-auto-accent/80">
        <span className="h-px w-4 bg-auto-accent/40" aria-hidden="true" />
        {classificationLabel}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold text-auto-text sm:text-5xl">{entity.title}</h1>
        <Badge variant="status" status={entity.status}>
          {statusLabel}
        </Badge>
        {entity.featured && <Badge variant="tag">Destacado</Badge>}
        {categoryHref && (
          <Link
            href={categoryHref}
            className="inline-flex items-center rounded-md border border-auto-accent/35 bg-auto-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-auto-accent-strong backdrop-blur-sm transition-colors hover:border-auto-accent hover:bg-auto-accent/25"
          >
            {vehicleCategory}
          </Link>
        )}
      </div>

      <Reveal delay={200}>
        <p className="max-w-3xl text-lg text-auto-text-secondary">{entity.description}</p>
      </Reveal>

      {entity.tags && entity.tags.length > 0 && (
        /* Tags = metadata pura (ej. "deportivo", "aston-martin"), no un
           filtro ni un estado: no ejecutan ninguna acción en esta página.
           Texto separado por punto medio en vez de una fila de cápsulas
           — con hasta 5 tags por entidad, cada uno como pill coloreada se
           leía como una fila de botones de filtro (mismo lenguaje visual
           que /vehiculos) sin ser interactiva. Ver auditoría de badges/pills. */
        <Reveal className="stagger mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1" delay={250}>
          {entity.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs capitalize text-auto-text-tertiary [&:not(:first-child)]:before:mr-2.5 [&:not(:first-child)]:before:text-auto-text-tertiary/50 [&:not(:first-child)]:before:content-['·']"
            >
              {tag.replace(/-/g, ' ')}
            </span>
          ))}
        </Reveal>
      )}
    </>
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />

      {/* Header — el fondo ambiental por categoría (EntityHeaderBackground) se
          mantiene siempre: es identidad visual de bajo costo (CSS/SVG, sin JS).
          Las fichas `featured` se diferencian con un borde de acento sólido
          (ver más abajo) en vez de un efecto interactivo — sin JS extra. */}
      <SceneSection
        sceneId="entity-header"
        className="relative overflow-hidden border-b border-auto-border bg-gradient-to-b from-auto-card to-auto-dark py-10 sm:py-14"
      >
        <EntityHeaderBackground type={type} evidenceLevel={entity.evidence?.level} />
        <div className="container-max relative">
          <span
            className="pointer-events-none absolute -left-1 -top-1 hidden h-5 w-5 border-l border-t border-auto-accent/25 sm:block"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -bottom-1 -right-1 hidden h-5 w-5 border-b border-r border-auto-accent-orange/20 sm:block"
            aria-hidden="true"
          />
          {entity.featured ? (
            /* Antes: `MagicCard` con un orb que sigue al cursor y reacciona
               con "bloom" en el fondo WebGL — un efecto vistoso pero sin
               función real (no comunica nada que el usuario necesite, solo
               "se ve moderno"). Reemplazado por el mismo lenguaje visual de
               "expediente" que ya usa el resto del sitio (borde punteado en
               EntityCard, sello de evidencia, pestaña de categoría): acá,
               un borde de acento sólido en vez de uno gris, sin animación
               de por medio. Comunica "esta es una ficha destacada" con la
               misma claridad y cero JS extra. */
            <div className="rounded-lg border border-auto-accent/40 bg-auto-surface/60 p-6 sm:p-8">
              {headerContent}
            </div>
          ) : (
            <div className="rounded-lg border border-auto-border bg-auto-surface/60 p-6 sm:p-8">
              {headerContent}
            </div>
          )}
        </div>
      </SceneSection>

      {/* Content */}
      <SceneSection sceneId="entity-content" className="py-12 sm:py-16">
        <div className="container-max">
          <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {manufacturerStats && manufacturerStats.totalModels > 0 && (
              /* Resumen numérico + categorías + destacados (FASE 7, punto 2).
                 Va antes del contenido editorial: es el dato que un
                 visitante busca primero en una ficha de fabricante ("¿qué
                 y cuántos modelos tiene?"), el texto narrativo es
                 contexto adicional debajo. */
              <Reveal direction="left">
                <Card className="shadow-auto-sm">
                  <CardBody>
                    <EntitySectionHeading label="Modelos" />

                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-auto-border pb-4 sm:grid-cols-4">
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">
                          Modelos
                        </dt>
                        <dd className="font-mono text-lg font-semibold tabular-nums text-auto-text">
                          {manufacturerStats.totalModels}
                        </dd>
                      </div>
                      {manufacturerStats.powerRange && (
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">
                            Potencia
                          </dt>
                          <dd className="font-mono text-lg font-semibold tabular-nums text-auto-text">
                            {manufacturerStats.powerRange.min === manufacturerStats.powerRange.max
                              ? `${manufacturerStats.powerRange.min} hp`
                              : `${manufacturerStats.powerRange.min}–${manufacturerStats.powerRange.max} hp`}
                          </dd>
                        </div>
                      )}
                      {manufacturerStats.yearRange && (
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">
                            Años
                          </dt>
                          <dd className="font-mono text-lg font-semibold tabular-nums text-auto-text">
                            {manufacturerStats.yearRange.min === manufacturerStats.yearRange.max
                              ? manufacturerStats.yearRange.min
                              : `${manufacturerStats.yearRange.min}–${manufacturerStats.yearRange.max}`}
                          </dd>
                        </div>
                      )}
                      {manufacturerStats.featuredModels.length > 0 && (
                        <div>
                          <dt className="font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">
                            Destacados
                          </dt>
                          <dd className="font-mono text-lg font-semibold tabular-nums text-auto-text">
                            {manufacturerStats.featuredModels.length}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {manufacturerStats.categories.length > 0 && (
                      <div className="mt-4">
                        <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-auto-accent">
                          Categorías
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {manufacturerStats.categories.map(({ category, count }) => (
                            <Link
                              key={category}
                              href={`/categorias/${categoryToSlug(category)}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-auto-accent/35 bg-auto-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-auto-accent-strong backdrop-blur-sm transition-colors hover:border-auto-accent hover:bg-auto-accent/25"
                            >
                              {category}
                              <span className="text-auto-accent/70">({count})</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {manufacturerStats.featuredModels.length > 0 && (
                      <div className="mt-5">
                        <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-auto-accent">
                          Modelos destacados
                        </h3>
                        <ul className="space-y-1.5">
                          {manufacturerStats.featuredModels.map((model) => (
                            <li key={model.slug}>
                              <Link
                                href={`/vehiculos/${model.slug}`}
                                className="link-underline text-sm text-auto-text-secondary transition-colors hover:text-auto-accent"
                              >
                                {model.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Reveal>
            )}

            {entity.content ? (
              <Reveal direction="left">
                <Card className={entity.featured ? 'shadow-auto-sm border-auto-accent/30' : 'shadow-auto-sm'}>
                  <CardBody>
                    <EntityContent content={entity.content} />
                  </CardBody>
                </Card>
              </Reveal>
            ) : (
              <Reveal direction="left">
                <Card className="shadow-auto-sm">
                  <CardBody>
                    <p className="text-auto-text-secondary">
                      Todavía no hay contenido editorial extendido para esta entrada.
                    </p>
                  </CardBody>
                </Card>
              </Reveal>
            )}
          </div>

          <aside className="space-y-6">
            {ENTITY_IMAGE_CATEGORIES.includes(type) &&
              (galleryImages.length > 1 ? (
                <Reveal direction="right">
                  <EntityGallery images={galleryImages} entityTitle={entity.title} />
                </Reveal>
              ) : (
                <Reveal direction="right">
                  <EntityImage entity={entity} image={resolveEntityDisplayImage(entity)} variant="portrait" />
                </Reveal>
              ))}

            {relatedMedia.length > 0 && (
              <Reveal direction="right" delay={40}>
                <MediaCarousel title="Contenido audiovisual" assets={relatedMedia} />
              </Reveal>
            )}

            {entity.evidence && (
              <Reveal direction="right">
                <Card className="shadow-auto-sm">
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
                <Card className="shadow-auto-sm">
                  <CardBody>
                    <EntitySectionHeading label="Relacionado" index={relatedIndex} />
                    <RelationsPanel related={related} currentSlug={entity.slug} currentType={type} />
                  </CardBody>
                </Card>
              </Reveal>
            )}

            {hasSimilar && (
              <Reveal direction="right" delay={180}>
                <Card className="shadow-auto-sm">
                  <CardBody>
                    <EntitySectionHeading label="Vehículos similares" index={similarIndex} />
                    <SimilarVehiclesPanel items={similarVehicles} />
                  </CardBody>
                </Card>
              </Reveal>
            )}

            {/* Monetization: Ad Unit */}
            <Reveal direction="right" delay={200}>
              <AdUnit slotId="8314744878" format="responsive" dataTrackingLabel={`ad-${entity.slug}`} />
            </Reveal>

            {/* Monetization: Affiliate buttons (for vehicles). ML es la
                fuente de comisión real (programa de afiliados activo);
                OLX queda solo como link de referencia de tráfico, sin
                comisión propia hoy. */}
            {type === EntityType.VEHICLE && (
              <Reveal direction="right" delay={210}>
                <div className="flex flex-wrap justify-center gap-3 py-4">
                  <MercadoLibreAffiliateButton
                    vehicleName={entity.title}
                    trackingLabel={`vehicle-${entity.slug}`}
                  />
                  <OlxAffiliateButton vehicleName={entity.title} trackingLabel={`vehicle-${entity.slug}`} />
                </div>
              </Reveal>
            )}

            <Reveal direction="right" delay={220}>
              <Card className="shadow-auto-sm">
                <CardBody>
                  <EntitySectionHeading label="Información" index={infoIndex} />
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-auto-text-secondary">Categoría</dt>
                      <dd className="text-auto-text">{TYPE_LABELS[type]}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-auto-text-secondary">Estado</dt>
                      <dd className="text-auto-text">{statusLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-auto-text-secondary">Actualizado</dt>
                      <dd className="text-auto-text">
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
