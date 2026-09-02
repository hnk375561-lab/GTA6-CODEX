import Link from 'next/link'
import { EntityType } from '@/types'
import { Card } from '@/components/ui/Card'
import { Reveal } from './StageProgress'

/**
 * Un hecho puntual de una ficha, junto con su fuente citada — mismo dato
 * que ya vive en `evidence.primarySource` de esa entidad (ver
 * `EvidenceBlock.tsx`, la ficha completa), acá recortado a lo esencial
 * para el panel de la home: "esto es lo que decimos, esto es de dónde
 * sale". Nunca texto inventado para este panel — `primarySource` se pasa
 * tal cual está cargado en el contenido de la entidad, elegido en
 * `page.tsx` entre las entidades con mejor nivel de evidencia.
 */
export interface EvidenceHighlight {
  slug: string
  entityType: EntityType
  title: string
  /** Ícono + etiqueta corta del sello de evidencia (mismo origen que
   *  `EVIDENCE_STAMP_META`, ya resuelto en `page.tsx` para no importar
   *  ese registro dos veces). */
  levelIcon: string
  levelLabel: string
  levelClassName: string
  primarySource: string
}

interface EvidenceSpotlightProps {
  highlights: EvidenceHighlight[]
}

/**
 * Panel "Un dato, una fuente": el argumento editorial central del sitio
 * (que cada especificación es trazable, no relleno) hecho visible como
 * contenido propio en vez de quedar enterrado dentro de cada ficha —
 * mismo espíritu que el sello de evidencia que ya vive en `EntityCard`,
 * pero acá como protagonista de un panel completo del recorrido narrativo,
 * con la cita de la fuente primaria a la vista.
 */
export function EvidenceSpotlight({ highlights }: EvidenceSpotlightProps) {
  return (
    <div className="mx-auto w-full max-w-[80rem]">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
        Evidencia
      </p>
      <h2 className="mb-10 text-center font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
        Un dato, una fuente
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((item, i) => (
          <Reveal key={`${item.entityType}-${item.slug}`} index={i} total={highlights.length} className="h-full">
            <Card className="flex h-full flex-col !p-6 text-left">
              <span
                className={`mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${item.levelClassName}`}
              >
                <span aria-hidden="true">{item.levelIcon}</span>
                {item.levelLabel}
              </span>
              <Link
                href={`/${item.entityType}/${item.slug}`}
                className="font-display text-lg font-bold text-neutral-900 hover:text-orange-600"
              >
                {item.title}
              </Link>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-500">
                {item.primarySource}
              </p>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
