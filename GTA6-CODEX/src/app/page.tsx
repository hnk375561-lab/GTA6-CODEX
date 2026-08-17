import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getFeaturedEntities, getEntityCount, getEntityCountsByType } from '@/lib/entities'
import { getCharacterClipUrl, resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateHomepageMetadata, generateBreadcrumbJsonLd } from '@/lib/seo'
import { Card } from '@/components/ui/Card'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { CategoryCardMedia } from '@/components/ui/CategoryCardMedia'
import { EntityCard } from '@/components/entities/EntityCard'
import { getCategoryPreviewImages } from '@/lib/images'
import { RotatingHeroBackground } from '@/components/layout/RotatingHeroBackground'
import { SceneSection } from '@/components/webgl/SceneSection'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'

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

export default async function HomePage() {
  const [featured, totalCount, countsByType] = await Promise.all([
    getFeaturedEntities(6),
    getEntityCount(),
    getEntityCountsByType(),
  ])

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
              GTA6 Codex
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gta-text-secondary sm:text-xl">
              Wiki editorial de Grand Theft Auto 6: personajes, vehículos, ubicaciones,
              misiones y más — información verificada, rumores y análisis profundo, todo
              con su nivel de evidencia a la vista.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/personajes"
                className="btn-primary inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-semibold text-gta-darker transition-all hover:-translate-y-0.5"
              >
                Explorar el Codex
              </Link>
              <Link
                href="/buscar"
                className="inline-flex items-center justify-center rounded-lg border border-gta-border bg-gta-surface/60 px-8 py-3.5 font-semibold text-gta-text transition-all hover:-translate-y-0.5 hover:border-gta-accent/50"
              >
                Buscar en el Codex
              </Link>
            </div>
          </Reveal>

          <Reveal delay={250}>
            <p className="mt-8 text-sm text-gta-text-tertiary">
              {totalCount} {totalCount === 1 ? 'entrada documentada' : 'entradas documentadas'}
            </p>
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
              {featured.map((entity) => (
                <EntityCard
                  key={`${entity.type}-${entity.slug}`}
                  entity={entity}
                  image={resolveEntityDisplayImage(entity)}
                  clipUrl={entity.type === EntityType.CHARACTER ? getCharacterClipUrl(entity.slug) : undefined}
                  relationCount={featuredRelationCounts[entity.slug]}
                />
              ))}
            </div>
          </div>
        </SceneSection>
      )}
    </>
  )
}
