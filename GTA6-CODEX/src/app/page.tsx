import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import type { Trailer } from '@/types'
import {
  getFeaturedEntities,
  getEntityCount,
  getEntityCountsByType,
  getEntitiesByType,
} from '@/lib/entities'
import { getCharacterClipUrl, resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateHomepageMetadata, generateBreadcrumbJsonLd } from '@/lib/seo'
import { Card } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { CountUp } from '@/components/ui/CountUp'
import { CategoryCardMedia } from '@/components/ui/CategoryCardMedia'
import { EntityCard } from '@/components/entities/EntityCard'
import { getCategoryPreviewImages } from '@/lib/images'
import { RotatingHeroBackground } from '@/components/layout/RotatingHeroBackground'
import { SceneSection } from '@/components/webgl/SceneSection'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { DevelopmentTimeline, type TimelineEvent } from '@/components/home/DevelopmentTimeline'
import { QuickSearchForm } from '@/components/home/QuickSearchForm'

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata()
}

/**
 * Orden editorial de las tarjetas de categoría en la home: primero las 5
 * categorías núcleo (quiénes, dónde, con qué se mueven, misiones, material
 * oficial), el resto (armas, actividades, organizaciones, negocios,
 * objetos, noticias, guías) después, en el mismo orden que ya usa el menú
 * de navegación (`Header.tsx` / `Footer.tsx`).
 */
/**
 * Los 4 tipos que se destacan en el stat strip del hero — mismo criterio
 * que el mockup original ("Vehicles / Characters / Locations /
 * Businesses" al pie), pero alimentado por `countsByType` real en vez de
 * números hardcodeados, y con el total del sitio (`totalCount`) como
 * quinto valor destacado en el color de acento.
 */
const HERO_STAT_TYPES: EntityType[] = [
  EntityType.CHARACTER,
  EntityType.VEHICLE,
  EntityType.LOCATION,
  EntityType.BUSINESS,
]

const CATEGORY_ORDER: EntityType[] = [
  EntityType.CHARACTER,
  EntityType.LOCATION,
  EntityType.VEHICLE,
  EntityType.MISSION,
  EntityType.TRAILER,
  EntityType.WEAPON,
  EntityType.ACTIVITY,
  EntityType.FACTION,
  EntityType.BUSINESS,
  EntityType.OBJECT,
  EntityType.NEWS,
  EntityType.GUIDE,
]

/**
 * Color de acento por categoría — mismo trío de la paleta "Leonida
 * Nights" ya existente (magenta / cian / dorado), asignado por tipo de
 * contenido en vez de rotar al azar: gente y facciones en magenta
 * (el acento "humano" del sitio), lugares y material audiovisual en
 * cian (frío/espacial), objetos y economía del mundo en dorado. Da
 * identidad reconocible por sección sin introducir ningún color nuevo.
 */
const CATEGORY_ACCENT: Record<EntityType, string> = {
  [EntityType.CHARACTER]: '#ff2f8f',
  [EntityType.FACTION]: '#ff2f8f',
  [EntityType.MISSION]: '#ff2f8f',
  [EntityType.NEWS]: '#ff2f8f',
  [EntityType.LOCATION]: '#22d3ee',
  [EntityType.TRAILER]: '#22d3ee',
  [EntityType.GUIDE]: '#22d3ee',
  [EntityType.VEHICLE]: '#f0c274',
  [EntityType.WEAPON]: '#f0c274',
  [EntityType.ACTIVITY]: '#f0c274',
  [EntityType.BUSINESS]: '#f0c274',
  [EntityType.OBJECT]: '#f0c274',
}

/**
 * Explicación de los 4 niveles de evidencia que ya usa el sitio a nivel de
 * ficha individual (ver `EvidenceBlock.tsx`), resumida acá para que el
 * criterio editorial del proyecto —su diferencial real frente a un wiki
 * genérico— sea visible desde la home y no recién al entrar a una entidad.
 * Mismo vocabulario e iconografía (✓ ◎ ◈ ?) que `EvidenceBlock`, para que
 * un visitante reconozca el badge cuando lo vea después en una ficha.
 */
const EVIDENCE_LEVELS: Array<{
  icon: string
  label: string
  description: string
  className: string
}> = [
  {
    icon: '✓',
    label: 'Oficial',
    description: 'Confirmado por Rockstar Games en un comunicado, tráiler o material propio.',
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  },
  {
    icon: '◎',
    label: 'Identificación visual',
    description: 'Visible en material oficial, aunque sin confirmación textual explícita.',
    className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  },
  {
    icon: '◈',
    label: 'Respaldado',
    description: 'Sin confirmación oficial directa, pero sostenido por fuentes secundarias solventes.',
    className: 'border-gta-accent-orange/25 bg-gta-accent-orange/10 text-gta-accent-orange',
  },
  {
    icon: '?',
    label: 'Especulativo',
    description: 'Teoría o rumor razonable, marcado como tal, sin evidencia sólida detrás — todavía.',
    className: 'border-gta-accent-warning/25 bg-gta-accent-warning/10 text-gta-accent-warning',
  },
]

export default async function HomePage() {
  const [featured, totalCount, countsByType, allNews, allTrailers] = await Promise.all([
    getFeaturedEntities(6),
    getEntityCount(),
    getEntityCountsByType(),
    getEntitiesByType(EntityType.NEWS),
    getEntitiesByType(EntityType.TRAILER),
  ])

  // Últimas 3 noticias por fecha real del evento (`createdAt`), no por
  // orden alfabético de `getEntitiesByType` — la portada de "Últimas
  // noticias" debe reflejar la cronología del desarrollo, no el título.
  const latestNews = [...allNews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
  const latestNewsImages = Object.fromEntries(
    latestNews.map((entity) => [entity.slug, resolveEntityDisplayImage(entity)])
  )

  // Línea de tiempo del desarrollo: noticias + tráilers combinados, en
  // orden cronológico ascendente (a diferencia de "Últimas noticias",
  // que es descendente). Los tráilers usan `releaseDate` (fecha de
  // publicación real del video); las noticias usan `createdAt` (fecha
  // del evento que documentan) — ambos campos ya existen en el contenido,
  // no se deriva ni inventa ninguna fecha nueva.
  const timelineEvents: TimelineEvent[] = [...allNews, ...allTrailers]
    .map((entity) => ({
      entity,
      date: entity.type === EntityType.TRAILER ? (entity as Trailer).releaseDate : entity.createdAt,
      accent: CATEGORY_ACCENT[entity.type],
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const breadcrumbLd = generateBreadcrumbJsonLd([{ label: 'Inicio', url: '/' }])

  // Conteo de conexiones incluyendo relaciones inferidas/bidireccionales
  // para las cards de Destacados (Fase 8, hallazgo [7]) — mismo criterio
  // que ya se aplica en los listados por tipo, acotado a las 6 entidades
  // destacadas de home.
  const featuredRelationCounts = Object.fromEntries(
    await Promise.all(featured.map(async (e) => [e.slug, await getBidirectionalRelationCount(e)] as const))
  )

  const categories = CATEGORY_ORDER.filter((type) => countsByType[type] > 0)
  // Referencia para la barra de "densidad de archivo" de cada card de
  // categoría: la categoría con más entradas define el 100%, el resto
  // se expresa como proporción de esa — nunca se inventa un ranking
  // editorial, es puramente el conteo real de countsByType.
  const maxCategoryCount = Math.max(...categories.map((type) => countsByType[type]), 1)
  // Vista previa animada por categoría (ver CategoryCardMedia): hasta 3
  // imágenes locales reales de esa categoría (fondo principal + hasta 2
  // miniaturas superpuestas), o array vacío → fondo 100% CSS.
  const categoryPreviews = Object.fromEntries(
    categories.map((type) => [type, getCategoryPreviewImages(type, 3)])
  ) as Record<EntityType, ReturnType<typeof getCategoryPreviewImages>>

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Hero */}
      <SceneSection
        sceneId="home-hero"
        className="relative overflow-hidden border-b border-gta-border py-24 sm:py-32"
      >
        <RotatingHeroBackground />
        <div className="container-max relative text-center">
          <Reveal>
            <p className="eyebrow mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gta-accent-strong">
              Expediente no oficial · Leonida
            </p>
            <h1 className="text-gradient-vice mx-auto max-w-4xl font-display text-5xl font-bold leading-tight sm:text-7xl">
              GTA6 Zona
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gta-text-secondary sm:text-xl">
              Cada personaje, vehículo, ubicación y misión de GTA6, clasificado por nivel
              de evidencia — para que sepas de un vistazo qué es oficial y qué es rumor.
            </p>
          </Reveal>

          <Reveal delay={150}>
            {/* Un solo CTA de botón acá a propósito: antes había un segundo
                botón "Buscar en el Zona" apuntando al mismo /buscar que el
                QuickSearchForm de abajo — dos affordances distintas para la
                misma acción, una al lado de la otra, diluían cuál era la
                principal. El buscador real (con input) ya cubre ese caso
                mejor que un botón que aterriza en una página vacía. */}
            <div className="mt-10 flex justify-center">
              <Link
                href="/personajes"
                className="btn-primary inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-semibold text-gta-darker transition-all hover:-translate-y-0.5"
              >
                Entrar al expediente
              </Link>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-5">
              <QuickSearchForm />
            </div>
          </Reveal>

          <Reveal delay={250}>
            {/* mt-12 (antes mt-10): el strip de stats es un bloque de
                naturaleza distinta (datos, no acción) — más separación acá
                refuerza que cerró el bloque de "acción" de arriba (CTA +
                buscador) antes de pasar al de "cifras". */}
            <div className="glass-surface mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-xl border border-gta-border/70 px-8 py-5">
              {HERO_STAT_TYPES.map((type) => (
                <div key={type} className="flex flex-col items-center gap-0.5 px-2">
                  <span className="font-display text-2xl font-bold text-gta-text sm:text-3xl">
                    <CountUp end={countsByType[type] ?? 0} />
                  </span>
                  <span className="text-xs uppercase tracking-[0.15em] text-gta-text-tertiary">
                    {ENTITY_TYPE_LABELS[type]}
                  </span>
                </div>
              ))}
              <div className="hidden h-10 w-px bg-gta-border sm:block" aria-hidden="true" />
              <div className="flex flex-col items-center gap-0.5 px-2">
                <span className="font-display text-2xl font-bold text-gta-accent-strong sm:text-3xl">
                  <CountUp end={totalCount} />
                </span>
                <span className="text-xs uppercase tracking-[0.15em] text-gta-text-tertiary">
                  {totalCount === 1 ? 'Entrada total' : 'Entradas totales'}
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </SceneSection>

      {/* Categorías */}
      <SceneSection sceneId="home-categories" className="border-b border-gta-border py-16 sm:py-20">
        <div className="container-max">
          <Reveal className="mb-10 text-center">
            <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gta-accent">
              Categorías
            </p>
            <h2 className="text-3xl font-bold text-gta-text sm:text-4xl">Explorá por sección</h2>
          </Reveal>

          <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((type, i) => {
              const density = Math.max(6, Math.round((countsByType[type] / maxCategoryCount) * 100))
              const accent = CATEGORY_ACCENT[type]
              return (
                <Link
                  key={type}
                  href={`/${type}`}
                  className="group category-card block h-full"
                  style={{ '--gta-corner-color': accent } as CSSProperties}
                >
                  <Card
                    hoverable
                    className="relative flex h-full flex-col overflow-hidden !p-0 text-center"
                  >
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
                      <CategoryCardMedia previews={categoryPreviews[type]} />
                      <div className="category-icon-badge absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-lg text-gta-accent">
                        <CategoryIcon type={type} className="h-5 w-5" />
                      </div>
                      <span className="category-card-corner category-card-corner--tl" aria-hidden="true" />
                      <span className="category-card-corner category-card-corner--tr" aria-hidden="true" />
                      <span className="category-card-corner category-card-corner--bl" aria-hidden="true" />
                      <span className="category-card-corner category-card-corner--br" aria-hidden="true" />
                      <div className="category-card-redaction category-card-redaction--top" aria-hidden="true">
                        <span className="category-card-redaction-label">
                          Expediente · {ENTITY_TYPE_LABELS[type]}
                        </span>
                      </div>
                      <div className="category-card-redaction category-card-redaction--bottom" aria-hidden="true" />
                    </div>

                    <div className="relative z-10 flex flex-1 flex-col gap-2 px-5 py-4">
                      <p className="font-semibold text-gta-text">{ENTITY_TYPE_LABELS[type]}</p>
                      <p className="text-sm text-gta-text-secondary">
                        {countsByType[type]}{' '}
                        {countsByType[type] === 1 ? 'entrada' : 'entradas'}
                      </p>
                      <div className="category-card-meter-track" aria-hidden="true">
                        <div
                          className="category-card-meter-fill"
                          style={{ width: `${density}%`, background: accent }}
                        />
                      </div>
                      <span className="category-card-index" aria-hidden="true">
                        {String(i).padStart(2, '0')}
                      </span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>

          <Reveal className="mt-10 text-center">
            <Link
              href="/buscar"
              className="link-underline inline-flex items-center gap-1.5 text-sm font-semibold text-gta-accent transition-colors hover:text-gta-accent-strong"
            >
              Ver las {totalCount} entradas del expediente
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </SceneSection>

      {/* Destacados */}
      {featured.length > 0 && (
        <SceneSection sceneId="home-featured" className="py-16 sm:py-20">
          <div className="container-max">
            <Reveal className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gta-accent">
                  Destacados
                </p>
                <h2 className="text-3xl font-bold text-gta-text sm:text-4xl">
                  Lo más relevante del expediente
                </h2>
              </div>
              <Link
                href="/galeria"
                className="link-underline hidden shrink-0 text-sm font-semibold text-gta-accent transition-colors hover:text-gta-accent-strong sm:inline-block"
              >
                Ver galería completa
              </Link>
            </Reveal>

            <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((entity, i) => (
                <EntityCard
                  key={`${entity.type}-${entity.slug}`}
                  entity={entity}
                  image={resolveEntityDisplayImage(entity)}
                  clipUrl={entity.type === EntityType.CHARACTER ? getCharacterClipUrl(entity.slug) : undefined}
                  relationCount={featuredRelationCounts[entity.slug]}
                  size={i === 0 ? 'hero' : 'default'}
                  className={i === 0 ? 'sm:col-span-2' : undefined}
                />
              ))}
            </div>
          </div>
        </SceneSection>
      )}

      {/* Línea de tiempo del desarrollo */}
      {timelineEvents.length > 0 && (
        <SceneSection sceneId="home-timeline" className="border-t border-gta-border py-16 sm:py-20">
          <div className="container-max">
            <Reveal className="mx-auto mb-12 max-w-2xl text-center">
              <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gta-accent">
                Cronología
              </p>
              <h2 className="text-3xl font-bold text-gta-text sm:text-4xl">
                Línea de tiempo del desarrollo
              </h2>
              <p className="mt-4 text-gta-text-secondary">
                Del anuncio a hoy, cada hito oficial y cada tráiler documentado, en orden.
              </p>
            </Reveal>

            <DevelopmentTimeline events={timelineEvents} />
          </div>
        </SceneSection>
      )}

      {/* Cómo verificamos */}
      <SceneSection sceneId="home-evidence" className="border-t border-gta-border py-16 sm:py-20">
        <div className="container-max">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gta-accent">
              Metodología
            </p>
            <h2 className="text-3xl font-bold text-gta-text sm:text-4xl">Cómo verificamos la información</h2>
            <p className="mt-4 text-gta-text-secondary">
              Cada entrada del expediente lleva su propio nivel de evidencia a la vista, en vez
              de mezclar confirmación oficial con rumor sin distinción. Así se ve en cada ficha:
            </p>
          </Reveal>

          <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EVIDENCE_LEVELS.map((level) => (
              <Card key={level.label} className="h-full">
                <span
                  className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full border text-base font-semibold ${level.className}`}
                  aria-hidden="true"
                >
                  {level.icon}
                </span>
                <p className="mb-1.5 font-semibold text-gta-text">{level.label}</p>
                <p className="text-sm text-gta-text-secondary">{level.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </SceneSection>

      {/* Últimas noticias */}
      {latestNews.length > 0 && (
        <SceneSection sceneId="home-news" className="border-t border-gta-border py-16 sm:py-20">
          <div className="container-max">
            <Reveal className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gta-accent">
                  Últimas noticias
                </p>
                <h2 className="text-3xl font-bold text-gta-text sm:text-4xl">
                  Novedades del desarrollo
                </h2>
              </div>
              <Link
                href="/noticias"
                className="link-underline hidden shrink-0 text-sm font-semibold text-gta-accent transition-colors hover:text-gta-accent-strong sm:inline-block"
              >
                Ver todas las noticias
              </Link>
            </Reveal>

            <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestNews.map((entity) => (
                <EntityCard
                  key={`${entity.type}-${entity.slug}`}
                  entity={entity}
                  image={latestNewsImages[entity.slug]}
                />
              ))}
            </div>

            <Reveal className="mt-8 text-center sm:hidden">
              <Link
                href="/noticias"
                className="link-underline inline-flex items-center gap-1.5 text-sm font-semibold text-gta-accent transition-colors hover:text-gta-accent-strong"
              >
                Ver todas las noticias
                <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          </div>
        </SceneSection>
      )}

      {/* CTA final */}
      <SceneSection sceneId="home-cta" className="border-t border-gta-border py-16 sm:py-24">
        <div className="container-max text-center">
          <Reveal>
            <div className="glass-surface mx-auto max-w-2xl rounded-2xl border border-gta-border/70 px-8 py-12 sm:px-14">
              <h2 className="text-gradient-vice font-display text-3xl font-bold sm:text-4xl">
                ¿Buscás algo puntual?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-gta-text-secondary">
                Personajes, vehículos, misiones, ubicaciones o tráilers: todo el expediente es
                buscable, con su nivel de evidencia siempre visible.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/buscar"
                  className="btn-primary inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-semibold text-gta-darker transition-all hover:-translate-y-0.5"
                >
                  Buscar en el Zona
                </Link>
                <Link
                  href="/galeria"
                  className="inline-flex items-center justify-center rounded-lg border border-gta-border bg-gta-surface/60 px-8 py-3.5 font-semibold text-gta-text transition-all hover:-translate-y-0.5 hover:border-gta-accent/50"
                >
                  Ver galería
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </SceneSection>
    </>
  )
}
