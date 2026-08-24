import Link from 'next/link'
import { EntityType } from '@/types'
import type { Entity } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { STATUS_LABELS } from '@/lib/entity-labels'

export interface TimelineEvent {
  entity: Entity
  /** Fecha real del evento — `releaseDate` para trailers, `createdAt`
   *  para noticias (ver resolución en `page.tsx`, ninguna se inventa acá). */
  date: string
  /** Color de acento heredado de `CATEGORY_ACCENT` en `page.tsx`, para que
   *  el punto de la línea de tiempo use el mismo código de color que ya
   *  identifica a esa categoría en el resto de la home. */
  accent: string
}

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Línea de tiempo cronológica del desarrollo de GTA VI, construida
 * exclusivamente a partir de noticias y tráilers ya documentados en
 * `src/content` (ver `page.tsx`, que arma `events` y se lo pasa a este
 * componente) — cero fechas o hitos inventados. Es un recorrido narrativo
 * distinto a "Últimas noticias" (que muestra solo lo más reciente, en
 * orden descendente): acá el orden es ascendente, de anuncio a presente,
 * para que se lea como una historia.
 */
export function DevelopmentTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null

  return (
    <div className="relative mx-auto max-w-3xl">
      <div
        className="absolute bottom-0 left-[15px] top-0 w-px bg-auto-border sm:left-[19px]"
        aria-hidden="true"
      />
      {events.map(({ entity, date, accent }, i) => (
        <Reveal key={`${entity.type}-${entity.slug}`} delay={i * 60} className="relative pb-10 pl-10 last:pb-0 sm:pl-14">
          <span
            className="absolute left-0 top-1 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border-2 bg-auto-darker sm:h-[39px] sm:w-[39px]"
            style={{ borderColor: accent }}
            aria-hidden="true"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          </span>

          <Link href={`/${entity.type}/${entity.slug}`} className="group block">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-auto-text-tertiary">
              {formatEventDate(date)}
            </p>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-auto-text transition-colors group-hover:text-auto-accent">
                {entity.title}
              </h3>
              <Badge variant="status" status={entity.status}>
                {STATUS_LABELS[entity.status]}
              </Badge>
              {entity.type === EntityType.TRAILER && <Badge variant="tag">Tráiler</Badge>}
            </div>
            <p className="line-clamp-2 text-sm text-auto-text-secondary">{entity.description}</p>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}
