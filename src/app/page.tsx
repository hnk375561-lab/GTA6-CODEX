import Link from 'next/link'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { EntityType, type Vehicle } from '@/types'
import { SITE_NAME } from '@/config/site'
import {
  getFeaturedEntities,
  getEntityCount,
  getEntitiesByType,
} from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateHomepageMetadata, generateBreadcrumbJsonLd, generateWebsiteJsonLd, serializeJsonLd } from '@/lib/seo'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
import { getAvailableRankings } from '@/lib/rankings'
import { getManufacturerMarqueeItems } from '@/lib/vehicle-manufacturers'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { Reveal } from '@/components/ui/Reveal'
import { EntityCard } from '@/components/entities/EntityCard'
import { AdUnit } from '@/components/monetization/AdUnit'
import { RankingsSpotlight, type RankingSpotlight } from '@/components/home/RankingsSpotlight'
import { FeaturedCarousel } from '@/components/home/FeaturedCarousel'
import { HomeFaqPanel, type FaqItem } from '@/components/home/HomeFaqPanel'
import { FinancingCalculator } from '@/components/ui/FinancingCalculator'
import { FinancingCalculatorSkeleton } from '@/components/ui/loading'
import { formatRelativeTime } from '@/lib/utils'
import { VehicleRadarExplorer } from '@/components/home/VehicleRadarExplorer'
import { HomeIntroduction } from '@/components/home/HomeIntroduction'
import { ManufacturerVisualization } from '@/components/home/ManufacturerVisualization'

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata()
}

/**
 * ============================================================================
 * HOME — REDISEÑO RADICAL 180° (septiembre 2026)
 * ============================================================================
 *
 * RUPTURA VISUAL COMPLETA: se elimina todo patrón anterior
 * (dossier, hero showcase, secciones centradas). 
 *
 * NUEVA METÁFORA: "Catálogo Vivo — Un Radar Global de Máquinas"
 * - Entrada editorial (NO hero): portada brutalista sin CTA explícita
 * - Explorador visual: vehículos como puntos en coordenadas (marca × segmento)
 * - Datos como lenguaje: escala, densidad, color comunican información
 * - Navegación integrada: filtros/búsqueda como parte de la composición
 * - Scroll como descubrimiento: cada sección revela dimensión diferente
 *
 * SECCIONES (totalmente reorganizadas):
 * 1. INTRO editorial — título desordenado, sin CTA, solo invitación
 * 2. RADAR explorador — vehículos por marca/segmento, escala visual
 * 3. FABRICANTES — visualización de marca como "colecciones visuales"
 * 4. RANKINGS — lista viva, no cards (ruptura de grilla)
 * 5. CATÁLOGO VIVO — carrusel de destacados (sin cambio lógico, solo composición)
 * 6. FINANCIAMIENTO — calculadora integrada (mismo componente, otra envolvura)
 * 7. FAQ — panel conversacional
 * 8. CIERRE — CTA final, no intro
 *
 * CAMBIOS TÉCNICOS:
 * - Componentes visuales nuevos: VehicleRadarExplorer, HomeIntroduction, ManufacturerVisualization
 * - Tailwind: nuevas clases para composición asimétrica/brutalista
 * - Globales.css: nuevas variables para "escala visual radical"
 * - No se toca la lógica de datos (getFeaturedEntities, etc.), solo presentación
 */

const MIN_COMPARE_SHOWCASE_POOL = 2
const HOME_EVIDENCE_HIGHLIGHTS_LIMIT = 6
const HOME_RANKING_TOP_ENTRIES = 3

const EVIDENCE_LEVEL_PRIORITY: Record<EvidenceLevel, number> = {
  'oficial-nombrado': 0,
  'oficial-visual-multifuente': 1,
  'oficial-visual': 2,
  respaldado: 3,
  especulativo: 4,
}

function FinancingCalculatorFallback() {
  return <FinancingCalculatorSkeleton />
}

export default async function Home() {
  // ========== DATA FETCHING (sin cambios lógicos) ==========
  const [
    totalVehicleCount,
    entityCounts,
    featured,
    latestNews,
    availableRankings,
  ] = await Promise.all([
    getEntityCount(EntityType.VEHICLE),
    getEntityCountsByType(),
    getFeaturedEntities(100), // traer más para poder variar la presentación visual
    getEntitiesByType(EntityType.NEWS, { limit: 10 }),
    getAvailableRankings(),
  ])

  const featuredRelationCounts: Record<string, number> = {}
  for (const entity of featured) {
    featuredRelationCounts[entity.slug] = await getBidirectionalRelationCount(
      entity.slug,
      entity.type,
    )
  }

  const latestNewsImages: Record<string, string | null> = {}
  const latestNewsDates: Record<string, string> = {}
  for (const entity of latestNews) {
    latestNewsImages[entity.slug] = resolveEntityDisplayImage(entity)
    latestNewsDates[entity.slug] = entity.date ? formatRelativeTime(entity.date) : ''
  }

  const rankingsSpotlightData: RankingSpotlight[] = availableRankings
    .slice(0, 3)
    .map((ranking) => ({
      slug: ranking.slug,
      name: ranking.name,
      topEntries: ranking.vehicles.slice(0, HOME_RANKING_TOP_ENTRIES),
    }))

  const faqItems: FaqItem[] = [
    {
      question: '¿Qué datos verificaste de cada vehículo?',
      answer:
        'Cada ficha técnica cita su fuente: catálogos oficiales, sitios del fabricante, ensayos de seguridad NCAP, informes de consumo de organismos independientes. Si no tiene fuente, lo marcamos como especulativo.',
    },
    {
      question: '¿Por qué algunos vehículos tienen más datos que otros?',
      answer:
        'Los fabricantes grandes publican más especificaciones. Los datos nuevos llegan con cada actualización; el catálogo crece conforme aparecen más fiches verificadas.',
    },
    {
      question: '¿Puedo usar estos datos para comparar modelos?',
      answer:
        'Exactamente. Usá el comparador de dos o tres vehículos, consultá los rankings por criterio (potencia, precio, consumo), y simulá tu cuota en la calculadora. Todo con fuentes citadas.',
    },
    {
      question: '¿Cuánto cuesta anunciarse acá?',
      answer:
        'Escribí a anunciate@sinfrenos.com.ar con presupuesto y alcance. Tenemos planes para fabricantes, concesionarios y servicios automotrices.',
    },
  ]

  // ========== RENDER (nueva composición completamente diferente) ==========
  return (
    <>
      <div className="min-h-screen bg-surface-page selection:bg-auto-accent selection:text-white">
        {/* ============= INTRO EDITORIAL (SIN HERO) ============= */}
        <section className="relative overflow-hidden border-b border-edge py-24 sm:py-32 lg:py-40">
          <div className="container-max">
            <HomeIntroduction vehicleCount={totalVehicleCount} />
          </div>
        </section>

        {/* ============= RADAR EXPLORADOR (NUEVO COMPONENTE) ============= */}
        <section className="relative border-b border-edge py-24 sm:py-32 lg:py-40 bg-surface-alt">
          <div className="container-max">
            <Reveal className="mb-8 lg:mb-12">
              <div className="grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10">
                <span className="font-mono text-7xl font-light text-edge tracking-tighter">1</span>
                <div>
                  <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">Coordenadas Visuales</p>
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mt-2">
                    El espacio de las máquinas
                  </h2>
                  <p className="text-neutral-600 mt-4 max-w-xl leading-relaxed">
                    Cada vehículo como punto en el mapa. Tamaño = potencia. Posición = marca × segmento.
                    Descubrí patrones visuales en los datos.
                  </p>
                </div>
              </div>
            </Reveal>
            <Suspense fallback={<div className="h-96 bg-surface-card rounded animate-pulse" />}>
              <VehicleRadarExplorer vehicles={featured.slice(0, 50)} />
            </Suspense>
          </div>
        </section>

        {/* ============= FABRICANTES (NUEVA PRESENTACIÓN) ============= */}
        <section className="relative border-b border-edge py-24 sm:py-32 lg:py-40">
          <div className="container-max">
            <Reveal className="mb-8 lg:mb-12">
              <div className="grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10">
                <span className="font-mono text-7xl font-light text-edge tracking-tighter">2</span>
                <div>
                  <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">Colecciones por Marca</p>
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mt-2">
                    Cada fabricante, un universo
                  </h2>
                  <p className="text-neutral-600 mt-4 max-w-xl leading-relaxed">
                    Desde el lujo hasta el acceso: visualizá cómo cada marca completa su catálogo.
                  </p>
                </div>
              </div>
            </Reveal>
            <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 h-64" />}>
              <ManufacturerVisualization vehicles={featured.slice(0, 100)} />
            </Suspense>
          </div>
        </section>

        {/* ============= RANKINGS (LISTA VIVA, NO CARDS) ============= */}
        {rankingsSpotlightData.length > 0 && (
          <section className="relative border-b border-edge py-24 sm:py-32 lg:py-40 bg-surface-alt">
            <div className="container-max">
              <Reveal className="mb-8 lg:mb-12">
                <div className="grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10">
                  <span className="font-mono text-7xl font-light text-edge tracking-tighter">3</span>
                  <div>
                    <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">Listas Vivas</p>
                    <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mt-2">
                      Los mejores, por criterio
                    </h2>
                    <p className="text-neutral-600 mt-4 max-w-xl leading-relaxed">
                      Potencia, precio, seguridad, consumo: ver el ranking completo en cada categoría.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal>
                <RankingsSpotlight rankings={rankingsSpotlightData} />
              </Reveal>
            </div>
          </section>
        )}

        {/* ============= DESTACADOS (CARRUSEL VISUAL) ============= */}
        {featured.length > 0 && (
          <section className="relative border-b border-edge py-24 sm:py-32 lg:py-40">
            <div className="container-max">
              <Reveal className="mb-8 lg:mb-12">
                <div className="grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10">
                  <span className="font-mono text-7xl font-light text-edge tracking-tighter">4</span>
                  <div>
                    <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">Catálogo Vivo</p>
                    <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mt-2">
                      Lo más relevante ahora
                    </h2>
                    <p className="text-neutral-600 mt-4 max-w-xl leading-relaxed">
                      Vehículos con mayor investigación, más datos verificados, recién agregados.
                    </p>
                  </div>
                </div>
              </Reveal>
              <FeaturedCarousel ariaLabel="Vehículos destacados">
                {featured.slice(0, 20).map((entity, i) => (
                  <div
                    key={`${entity.type}-${entity.slug}`}
                    className="w-[44%] shrink-0 snap-start snap-stop-always sm:w-[30%] lg:w-[22%]"
                  >
                    <Reveal delay={i * 30}>
                      <EntityCard
                        entity={entity}
                        image={resolveEntityDisplayImage(entity)}
                        clipUrl={undefined}
                        relationCount={featuredRelationCounts[entity.slug]}
                        size="compact"
                      />
                    </Reveal>
                  </div>
                ))}
              </FeaturedCarousel>
            </div>
          </section>
        )}

        {/* ============= FINANCIAMIENTO ============= */}
        <section className="relative border-b border-edge py-24 sm:py-32 lg:py-40 bg-surface-alt">
          <div className="container-max">
            <Reveal className="mb-8 lg:mb-12">
              <div className="grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10">
                <span className="font-mono text-7xl font-light text-edge tracking-tighter">5</span>
                <div>
                  <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">Simulador</p>
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mt-2">
                    Calculá tu cuota
                  </h2>
                  <p className="text-neutral-600 mt-4 max-w-xl leading-relaxed">
                    Precio, entrega, tasa y plazo en una misma calculadora. Sin dejar la página.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal className="max-w-xl">
              <Suspense fallback={<FinancingCalculatorFallback />}>
                <FinancingCalculator />
              </Suspense>
            </Reveal>
          </div>
        </section>

        {/* ============= FAQ ============= */}
        <section className="relative border-b border-edge py-24 sm:py-32 lg:py-40">
          <div className="container-max">
            <Reveal className="mb-8 lg:mb-12">
              <div className="grid gap-4 lg:grid-cols-[7rem_1fr] lg:gap-10">
                <span className="font-mono text-7xl font-light text-edge tracking-tighter">6</span>
                <div>
                  <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">Preguntas</p>
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mt-2">
                    Lo que preguntás
                  </h2>
                </div>
              </div>
            </Reveal>
            <HomeFaqPanel items={faqItems} />
          </div>
        </section>

        {/* ============= CIERRE ROBUSTO ============= */}
        <section className="relative border-b border-edge py-24 sm:py-32 lg:py-40 bg-surface-alt">
          <div className="container-max">
            <Reveal className="max-w-2xl mx-auto">
              <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase mb-8">Acción Final</p>
              <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter mb-8 leading-none">
                Sin Frenos:<br />
                <span className="text-auto-accent">el archivo vivo</span>
              </h2>
              <p className="text-lg text-neutral-600 mb-12 max-w-xl leading-relaxed">
                250+ vehículos. Datos verificados. Comparación en vivo. Tu cuota simulada. Todo en un lugar. 
                No hace falta buscar en otro lado.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/vehiculos"
                  className="cta-shine tap-scale group inline-flex items-center justify-center gap-2 rounded-full bg-inverse px-10 py-5 font-semibold text-white transition-transform hover:-translate-y-1 text-lg"
                >
                  Explorar catálogo
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <Link
                  href="/comparar"
                  className="tap-scale inline-flex items-center justify-center rounded-full border-2 border-neutral-300 px-10 py-5 font-semibold text-neutral-900 transition-transform hover:-translate-y-1 text-lg"
                >
                  Comparar dos vehículos
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </div>
    </>
  )
}

async function getEntityCountsByType() {
  const counts: Record<EntityType, number> = {
    [EntityType.VEHICLE]: 0,
    [EntityType.NEWS]: 0,
    [EntityType.GUIDE]: 0,
    [EntityType.MANUFACTURER]: 0,
  }

  for (const type of Object.values(EntityType)) {
    counts[type] = await getEntityCount(type)
  }

  return counts
}
