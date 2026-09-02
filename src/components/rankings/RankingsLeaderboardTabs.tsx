'use client'

import { useState, useId } from 'react'
import Link from 'next/link'
import type { Vehicle } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { EntityCard } from '@/components/entities/EntityCard'
import { cn } from '@/lib/utils'

export interface RankingTabEntry {
  vehicle: Vehicle
  position: number
  metricLabel: string
}

export interface RankingTabData {
  slug: string
  shortTitle: string
  criterionLabel: string
  eligibleCount: number
  entries: RankingTabEntry[]
}

interface RankingsLeaderboardTabsProps {
  rankings: RankingTabData[]
  imageBySlug: Record<string, ResolvedDisplayImage | null>
  relationCountBySlug: Record<string, number>
  /** Cuántas posiciones se muestran en el preview (el ranking completo,
   *  con hasta `RANKING_TOP_N`, vive en `/rankings/[slug]`). */
  previewCount: number
}

/**
 * Prioridad C: tabs animados en el índice de `/rankings`. Antes, la
 * página índice solo mostraba una grilla de cards que enlazaban a cada
 * `/rankings/[slug]` — para ver el leaderboard había que navegar y volver.
 * Este componente reutiliza exactamente los mismos datos ya calculados
 * por `getAvailableRankings()` (ningún criterio ni orden nuevo, mismo
 * `RankingEntry` de `lib/rankings.ts`) para mostrar un preview navegable
 * sin recargar la página: cambiar de tab hace un crossfade entre
 * leaderboards, no un fade genérico de biblioteca — la transición vive
 * en `globals.css` (`.rankings-tabs-panel`): el `key={active.slug}` del
 * panel fuerza a React a desmontar/montar el contenido en cada cambio de
 * tab, así la animación de entrada corre siempre, incluso si se vuelve a
 * elegir un tab ya visitado.
 *
 * Las páginas `/rankings/[slug]` siguen existiendo tal cual (SEO,
 * JSON-LD `ItemList`, top `RANKING_TOP_N` completo) — este preview solo
 * muestra `previewCount` posiciones con un link "Ver ranking completo".
 */
export function RankingsLeaderboardTabs({
  rankings,
  imageBySlug,
  relationCountBySlug,
  previewCount,
}: RankingsLeaderboardTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const tabsId = useId()

  if (rankings.length === 0) return null

  const active = rankings[activeIndex]

  return (
    <div>
      <div
        role="tablist"
        aria-label="Elegí un ranking"
        className="mb-6 flex flex-wrap gap-2"
      >
        {rankings.map((ranking, index) => {
          const isActive = index === activeIndex
          return (
            <button
              key={ranking.slug}
              type="button"
              role="tab"
              id={`${tabsId}-tab-${ranking.slug}`}
              aria-selected={isActive}
              aria-controls={`${tabsId}-panel-${ranking.slug}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
                isActive
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-edge text-neutral-500 hover:border-auto-accent hover:text-auto-accent-strong'
              )}
            >
              {ranking.shortTitle}
            </button>
          )
        })}
      </div>

      <div
        key={active.slug}
        id={`${tabsId}-panel-${active.slug}`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${active.slug}`}
        className="rankings-tabs-panel"
      >
        <p className="mb-4 text-sm text-neutral-500">
          Top {Math.min(previewCount, active.entries.length)} de {active.eligibleCount} vehículos
          comparables, ordenados por {active.criterionLabel}.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {active.entries.slice(0, previewCount).map((entry) => (
            <EntityCard
              key={entry.vehicle.slug}
              entity={entry.vehicle}
              image={imageBySlug[`${entry.vehicle.type}/${entry.vehicle.slug}`]}
              typeLabel="Vehículo"
              relationCount={relationCountBySlug[entry.vehicle.slug]}
              rankBadge={{ position: entry.position, metricLabel: entry.metricLabel }}
            />
          ))}
        </div>

        <div className="mt-6">
          <Link
            href={`/rankings/${active.slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-auto-accent transition-colors hover:text-auto-accent-strong"
          >
            Ver ranking completo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
