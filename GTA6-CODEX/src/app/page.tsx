import Link from 'next/link'
import type { Metadata } from 'next'
import { EntityType } from '@/types'
import { getFeaturedEntities, getEntityCount, getEntityCountsByType } from '@/lib/entities'
import { generateHomepageMetadata, generateBreadcrumbJsonLd } from '@/lib/seo'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { CategoryCardMedia } from '@/components/ui/CategoryCardMedia'
import { EntityImage } from '@/components/entities/EntityImage'
import { getCategoryPreviewImage } from '@/lib/images'
import { RotatingHeroBackground } from '@/components/layout/RotatingHeroBackground'
import { SceneSection } from '@/components/webgl/SceneSection'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata()
}

const STATUS_LABELS = {
  confirmado: 'Confirmado',
  rumor: 'Rumor',
  nuestro: 'Nuestro',
} as const

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

export default async function HomePage() {
  const [featured, totalCount, countsByType] = await Promise.all([
    getFeaturedEntities(6),
    getEntityCount(),
    getEntityCountsByType(),
  ])

  const breadcrumbLd = generateBreadcrumbJsonLd([{ label: 'Inicio', url: '/' }])

  const categories = CATEGORY_ORDER.filter((type) => countsByType[type] > 0)
  // Vista previa animada por categoría (ver CategoryCardMedia): primera
  // imagen local real de esa categoría, o null → fondo 100% CSS.
  const categoryPreviews = Object.fromEntries(
    categories.map((type) => [type, getCategoryPreviewImage(type)])
  ) as Record<EntityType, ReturnType<typeof getCategoryPreviewImage>>

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
            {categories.map((type) => (
              <Link key={type} href={`/${type}`} className="group block h-full">
                <Card
                  hoverable
                  className="relative flex h-full flex-col items-center gap-3 overflow-hidden py-8 text-center"
                >
                  <CategoryCardMedia preview={categoryPreviews[type]} />
                  <div className="category-icon-badge relative z-10 flex h-14 w-14 items-center justify-center rounded-xl text-gta-accent">
                    <CategoryIcon type={type} className="h-6 w-6" />
                  </div>
                  <div className="relative z-10">
                    <p className="font-semibold text-gta-text">{ENTITY_TYPE_LABELS[type]}</p>
                    <p className="mt-1 text-sm text-gta-text-secondary">
                      {countsByType[type]}{' '}
                      {countsByType[type] === 1 ? 'entrada' : 'entradas'}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
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
                <Link
                  key={`${entity.type}-${entity.slug}`}
                  href={`/${entity.type}/${entity.slug}`}
                  className="group block h-full"
                >
                  <Card hoverable className="flex h-full flex-col overflow-hidden !p-0">
                    <EntityImage entity={entity} variant="thumbnail" className="!rounded-b-none" />
                    <CardBody className="flex flex-1 flex-col gap-2 px-5 pb-5">
                      <div className="flex items-center gap-2">
                        <Badge variant="status" status={entity.status}>
                          {STATUS_LABELS[entity.status]}
                        </Badge>
                        <span className="text-xs uppercase tracking-wide text-gta-text-tertiary">
                          {ENTITY_TYPE_LABELS[entity.type]}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gta-text">{entity.title}</h3>
                      <p className="line-clamp-2 text-sm text-gta-text-secondary">
                        {entity.description}
                      </p>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </SceneSection>
      )}
    </>
  )
}
