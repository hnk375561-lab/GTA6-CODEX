import Link from 'next/link'
import type { Trailer } from '@/types'
import { EntityType } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'

interface EntityNavProps {
  /** Tipo de entidad de la ficha actual — determina de qué listado se arma
   *  la navegación (personajes, vehículos, armas, etc.). */
  type: EntityType
  /** Slug de la ficha actualmente abierta. */
  currentSlug: string
}

/**
 * Navegación anterior/siguiente universal entre fichas del MISMO tipo de
 * entidad (Fase 8, etapa B — generalización de la navegación que antes
 * existía solo para trailers vía `TrailerNav`, ahora removido en favor de
 * este componente único).
 *
 * Orden:
 *  - Trailer mantiene su orden editorial ya establecido (`releaseDate`
 *    real, cronológico de publicación) — el mismo criterio que ya usaba
 *    `TrailerNav`, sin cambios de comportamiento para ese tipo.
 *  - El resto de tipos usa orden alfabético por `title` (mismo criterio
 *    con el que `getEntitiesByType`/`loadEntitiesByTypeSync` ya deja las
 *    entidades ordenadas antes de cachearlas — se reordena acá de forma
 *    explícita para no depender implícitamente de ese detalle interno).
 *
 * Sin loop artificial: en el primer/último elemento del tipo, ese lado se
 * muestra deshabilitado (no un link, `aria-disabled`) en vez de enrollar
 * al otro extremo. Incluye indicador de posición ("N / total") en el
 * centro. Nunca inventa entidades ni URLs: los links salen exclusivamente
 * de la lista real de contenido de ese tipo.
 */
export async function EntityNav({ type, currentSlug }: EntityNavProps) {
  const entities = await getEntitiesByType(type)

  const sorted =
    type === EntityType.TRAILER
      ? [...entities].sort(
          (a, b) =>
            new Date((a as Trailer).releaseDate).getTime() -
            new Date((b as Trailer).releaseDate).getTime()
        )
      : [...entities].sort((a, b) => a.title.localeCompare(b.title, 'es'))

  const index = sorted.findIndex((e) => e.slug === currentSlug)
  if (index === -1 || sorted.length < 2) return null

  const prev = index > 0 ? sorted[index - 1] : null
  const next = index < sorted.length - 1 ? sorted[index + 1] : null

  const typeLabelLower = ENTITY_TYPE_LABELS[type].toLowerCase()
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gta-accent focus-visible:ring-offset-2 focus-visible:ring-offset-gta-dark'

  return (
    <nav
      aria-label={`Navegación entre ${typeLabelLower}`}
      className="grid grid-cols-1 items-stretch gap-3 border-t border-gta-border pt-8 sm:grid-cols-[1fr_auto_1fr] sm:gap-4"
    >
      {prev ? (
        <Link
          href={`/${type}/${prev.slug}`}
          className={`group flex flex-col justify-center rounded-xl border border-gta-border bg-gta-card/60 px-5 py-4 transition-colors hover:border-gta-accent/60 hover:bg-gta-darker/60 ${focusRing}`}
        >
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Anterior
          </span>
          <span className="font-display text-sm font-semibold text-gta-text transition-colors group-hover:text-gta-accent-strong">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          className="flex cursor-not-allowed flex-col justify-center rounded-xl border border-gta-border/40 bg-gta-card/20 px-5 py-4 opacity-40"
        >
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Anterior
          </span>
          <span className="font-display text-sm font-semibold text-gta-text-tertiary">
            No hay {typeLabelLower} anterior
          </span>
        </div>
      )}

      <div className="flex items-center justify-center rounded-xl border border-gta-border/60 bg-gta-surface/40 px-4 py-4 text-center">
        <span className="font-mono text-xs text-gta-text-secondary" aria-label={`Posición ${index + 1} de ${sorted.length}`}>
          {index + 1} / {sorted.length}
        </span>
      </div>

      {next ? (
        <Link
          href={`/${type}/${next.slug}`}
          className={`group flex flex-col items-end justify-center rounded-xl border border-gta-border bg-gta-card/60 px-5 py-4 text-right transition-colors hover:border-gta-accent/60 hover:bg-gta-darker/60 ${focusRing}`}
        >
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
            Siguiente
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
          <span className="font-display text-sm font-semibold text-gta-text transition-colors group-hover:text-gta-accent-strong">
            {next.title}
          </span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          className="flex cursor-not-allowed flex-col items-end justify-center rounded-xl border border-gta-border/40 bg-gta-card/20 px-5 py-4 text-right opacity-40"
        >
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
            Siguiente
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
          <span className="font-display text-sm font-semibold text-gta-text-tertiary">
            No hay {typeLabelLower} siguiente
          </span>
        </div>
      )}
    </nav>
  )
}
