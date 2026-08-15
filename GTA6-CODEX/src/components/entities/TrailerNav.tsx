import Link from 'next/link'
import type { Trailer } from '@/types'
import { EntityType } from '@/types'
import { getEntitiesByType } from '@/lib/entities'

interface TrailerNavProps {
  currentSlug: string
}

/**
 * Navegación anterior/siguiente entre trailers, ordenados por
 * `releaseDate` real (orden cronológico oficial de publicación, no el
 * orden alfabético de archivo). Si el trailer actual es el primero o el
 * último, ese lado simplemente no se renderiza — sin loop artificial.
 */
export async function TrailerNav({ currentSlug }: TrailerNavProps) {
  const trailers = (await getEntitiesByType(EntityType.TRAILER)) as Trailer[]
  const sorted = [...trailers].sort(
    (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  )

  const index = sorted.findIndex((t) => t.slug === currentSlug)
  if (index === -1 || sorted.length < 2) return null

  const prev = index > 0 ? sorted[index - 1] : null
  const next = index < sorted.length - 1 ? sorted[index + 1] : null

  if (!prev && !next) return null

  return (
    <nav aria-label="Navegación entre trailers" className="grid gap-4 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/${EntityType.TRAILER}/${prev.slug}`}
          className="group flex flex-col justify-center rounded-xl border border-gta-border bg-gta-card/60 px-5 py-4 transition-colors hover:border-gta-accent/60 hover:bg-gta-darker/60"
        >
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Trailer anterior
          </span>
          <span className="font-display text-sm font-semibold text-gta-text transition-colors group-hover:text-gta-accent-strong">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/${EntityType.TRAILER}/${next.slug}`}
          className="group flex flex-col items-end justify-center rounded-xl border border-gta-border bg-gta-card/60 px-5 py-4 text-right transition-colors hover:border-gta-accent/60 hover:bg-gta-darker/60"
        >
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
            Siguiente trailer
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
          <span className="font-display text-sm font-semibold text-gta-text transition-colors group-hover:text-gta-accent-strong">
            {next.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  )
}
