import Link from 'next/link'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { EntityType, type Entity, type Vehicle } from '@/types'
import { SITE_NAME } from '@/config/site'
import {
  getFeaturedEntities,
  getEntitiesByType,
} from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { generateHomepageMetadata, generateBreadcrumbJsonLd, generateWebsiteJsonLd, serializeJsonLd } from '@/lib/seo'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
import { getAvailableRankings } from '@/lib/rankings'
import { getManufacturerMarqueeItems } from '@/lib/vehicle-manufacturers'
import { Reveal } from '@/components/ui/Reveal'
import { EntityCard } from '@/components/entities/EntityCard'
import { AdUnit } from '@/components/monetization/AdUnit'
import { ArchiveHero } from '@/components/home/ArchiveHero'
import { VehicleArchiveIndex } from '@/components/home/VehicleArchiveIndex'
import { ManufacturerArchive } from '@/components/home/ManufacturerArchive'
import { ArchiveClassifications, type ClassificationEntry, type Classification } from '@/components/home/ArchiveClassifications'
import { FeaturedDossiers } from '@/components/home/FeaturedDossiers'
import { ArchiveConsultations, type ConsultationItem } from '@/components/home/ArchiveConsultations'
import { FinancingCalculator } from '@/components/ui/FinancingCalculator'
import { FinancingCalculatorSkeleton } from '@/components/ui/loading'
import { formatRelativeTime } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata()
}

/**
 * ============================================================================
 * HOME — ARCHIVO AUTOMOTOR VERIFICADO (septiembre 2026)
 * ============================================================================
 *
 * IDENTIDAD NUEVA: "Archivo técnico físico de vehículos"
 * - Expdiente automotor
 * - Dossier documental
 * - Biblioteca especializada
 * - Fichas técnicas con fuentes citadas
 * - Sellos de evidencia y verificación
 * - Papel, tinta, anotaciones
 *
 * METÁFORA VISUAL:
 * - Entrada a un archivo físico especializado
 * - Documentos, fichas, carpetas
 * - Organización sistemática
 * - Profundidad editorial
 * - Rigor técnico
 *
 * SECCIONES (reconstruidas completamente):
 * 1. HERO ARCHIVO — identificador, título, buscador, fichas técnicas reales
 * 2. ÍNDICE DE VEHÍCULOS — organización por categorías tipo estantería
 * 3. ESTANTERÍA DE FABRICANTES — carpetas por marca
 * 4. CLASIFICACIONES DEL ARCHIVO — índices técnicos (rankings)
 * 5. DOSSIERS DESTACADOS — fichas seleccionadas
 * 6. CONSULTAS DEL ARCHIVO — FAQ formato documento
 * 7. FINANCIAMIENTO — calculadora integrada
 * 8. CIERRE — CTA final
 *
 * CAMBIOS TÉCNICOS:
 * - Componentes nuevos: ArchiveHero, VehicleArchiveIndex, ManufacturerArchive, etc.
 * - Paleta: Paper (#F4F1EA), Ink (#14110C), Oxide Red (#B23A24), Archive Green (#2B4436)
 * - Tipografía: serif editorial (títulos), mono/semi-mono (datos), sans neutral (texto)
 * - Eliminación de: radar, gradients, glow, glass, animaciones constantes, brutalismo digital
 */

const MIN_COMPARE_SHOWCASE_POOL = 2
const HOME_EVIDENCE_HIGHLIGHTS_LIMIT = 6
const HOME_RANKING_TOP_ENTRIES = 3

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
    (async () => (await getEntitiesByType(EntityType.VEHICLE)).length)(),
    getEntityCountsByType(),
    getFeaturedEntities(100),
    (async () => (await getEntitiesByType(EntityType.NEWS)).slice(0, 10))(),
    getAvailableRankings(),
  ])

  const featuredRelationCounts: Record<string, number> = {}
  for (const entity of featured) {
    featuredRelationCounts[entity.slug] = await getBidirectionalRelationCount(entity)
  }

  const latestNewsImages: Record<string, string | null> = {}
  const latestNewsDates: Record<string, string> = {}
  for (const entity of latestNews) {
    const image = resolveEntityDisplayImage(entity)
    latestNewsImages[entity.slug] = image ? image.src : null
    const dateSource = entity.createdAt || entity.updatedAt
    latestNewsDates[entity.slug] = dateSource ? formatRelativeTime(dateSource) : ''
  }

  // Convertir rankings al formato nuevo
  const classificationsData: Classification[] = availableRankings
    .slice(0, 4)
    .map((ranking) => ({
      slug: ranking.def.slug,
      shortTitle: ranking.def.shortTitle,
      title: ranking.def.title,
      direction: (ranking.def.direction === 'asc' ? 'min' : 'max') as 'min' | 'max',
      topEntries: ranking.entries.slice(0, HOME_RANKING_TOP_ENTRIES).map((entry) => ({
        position: entry.position,
        vehicleSlug: entry.vehicle.slug,
        vehicleTitle: entry.vehicle.title,
        metricValue: entry.metricValue,
        metricLabel: entry.metricLabel,
      })),
      eligibleCount: ranking.eligibleCount,
    }))

  const consultationItems: ConsultationItem[] = [
    {
      question: '¿Qué datos verificaste de cada vehículo?',
      answer:
        'Cada ficha técnica cita su fuente: catálogos oficiales, sitios del fabricante, ensayos de seguridad NCAP, informes de consumo de organismos independientes. Si no tiene fuente, lo marcamos como especulativo.',
    },
    {
      question: '¿Por qué algunos vehículos tienen más datos que otros?',
      answer:
        'Los fabricantes grandes publican más especificaciones. Los datos nuevos llegan con cada actualización; el catálogo crece conforme aparecen más fichas verificadas.',
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

  // Ejemplos de búsqueda (títulos reales del catálogo)
  const searchExamples = featured.slice(0, 5).map(v => v.title)

  // ========== RENDER (nueva composición completamente diferente) ==========
  return (
    <>
      <div className="min-h-screen bg-paper">
        {/* ============= HERO DEL ARCHIVO ============= */}
        <ArchiveHero
          vehicleCount={totalVehicleCount}
          evidenceCoveragePct={calculateEvidenceCoverage(featured)}
          featuredVehicles={featured.slice(0, 10) as Vehicle[]}
          searchExamples={searchExamples}
        />

        {/* ============= ÍNDICE DE VEHÍCULOS ============= */}
        <VehicleArchiveIndex vehicles={featured.slice(0, 24) as Vehicle[]} />

        {/* ============= ESTANTERÍA DE FABRICANTES ============= */}
        <ManufacturerArchive vehicles={featured.slice(0, 50) as Vehicle[]} />

        {/* ============= CLASIFICACIONES DEL ARCHIVO ============= */}
        {classificationsData.length > 0 && (
          <ArchiveClassifications classifications={classificationsData} />
        )}

        {/* ============= DOSSIERS DESTACADOS ============= */}
        {featured.length > 0 && (
          <FeaturedDossiers vehicles={featured.slice(0, 8) as Vehicle[]} />
        )}

        {/* ============= FINANCIAMIENTO ============= */}
        <section className="py-16 sm:py-24 lg:py-32 bg-paper border-t border-border">
          <div className="container-max">
            <Reveal className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-ink/10" />
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
                    HERRAMIENTAS DEL ARCHIVO
                  </span>
                  <div className="h-px flex-1 bg-ink/10" />
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
                  Calculadora de financiamiento
                </h2>
                <p className="font-sans text-ink/60 mt-4">
                  Simulá tu cuota con datos reales del mercado. Precio, entrega, tasa y plazo.
                </p>
              </div>
              <Suspense fallback={<FinancingCalculatorFallback />}>
                <FinancingCalculator />
              </Suspense>
            </Reveal>
          </div>
        </section>

        {/* ============= CONSULTAS DEL ARCHIVO ============= */}
        <ArchiveConsultations items={consultationItems} />

        {/* ============= CIERRE DEL ARCHIVO ============= */}
        <section className="py-16 sm:py-24 lg:py-32 bg-paper border-t border-border">
          <div className="container-max">
            <Reveal className="max-w-2xl mx-auto text-center">
              <div className="space-y-8">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50 mb-4">
                    ARCHIVO AUTOMOTOR VERIFICADO
                  </p>
                  <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-tight">
                    Sin Frenos:<br />
                    <span className="text-oxide-red">el archivo vivo</span>
                  </h2>
                </div>
                <p className="font-sans text-lg text-ink/70 leading-relaxed">
                  {totalVehicleCount}+ vehículos. Datos verificados. Comparación en vivo. Tu cuota simulada. 
                  Todo en un lugar. No hace falta buscar en otro lado.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link
                    href="/vehiculos"
                    className="font-mono text-xs uppercase tracking-[0.15em] bg-oxide-red text-white px-8 py-4 hover:bg-ink transition-colors duration-200"
                  >
                    Explorar archivo
                  </Link>
                  <Link
                    href="/comparar"
                    className="font-mono text-xs uppercase tracking-[0.15em] border border-ink/30 text-ink px-8 py-4 hover:border-ink hover:bg-paper transition-colors duration-200"
                  >
                    Comparar fichas
                  </Link>
                </div>
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
    counts[type] = (await getEntitiesByType(type)).length
  }

  return counts
}

function calculateEvidenceCoverage(entities: Entity[]): number | null {
  if (!entities.length) return null
  const withEvidence = entities.filter(e => e.evidence && e.evidence.level).length
  return Math.round((withEvidence / entities.length) * 100)
}
