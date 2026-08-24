import { EntityType } from '@/types'
import { GridPattern } from '@/components/ui/GridPattern'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'

interface EntityHeaderBackgroundProps {
  type: EntityType
  /** Nivel de evidencia de la entidad, si tiene. Cuando está presente se
   *  repite acá el mismo "sello" que el usuario ya vio en la card del
   *  listado (mismo ícono/color/mono, ver `EVIDENCE_STAMP_META`) — el
   *  objetivo es que el salto card → ficha no pierda esa señal en el
   *  camino, ni obligue a bajar hasta el bloque de Evidencia para
   *  recuperarla (Fase "Expediente", punto 2). */
  evidenceLevel?: EvidenceLevel | null
}

/**
 * Fondo ambiental del header de una ficha, reservado a entidades `featured`
 * (Nivel 4 del sistema de motion: "entidad extremadamente importante").
 *
 * Un solo lenguaje visual común (grid + glow + scanline, todos ya usados en
 * el resto del sitio) con una variación de énfasis por categoría en vez de
 * fondos completamente distintos:
 *  - Vehículo → grid técnico + sweep de escaneo horizontal
 *  - Resto (Noticia/Guía) → glow genérico, sin acento adicional
 *
 * 100% CSS/SVG, sin canvas ni JS: coste ~cero incluso repetido en varias
 * fichas, y no compite con el contenido (opacidades muy bajas).
 */
export function EntityHeaderBackground({ type, evidenceLevel }: EntityHeaderBackgroundProps) {
  const evidenceStamp = evidenceLevel ? EVIDENCE_STAMP_META[evidenceLevel] : null

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Glow ambiental base, común a todas las categorías */}
        <div className="entity-bg-glow" />

        {type === EntityType.VEHICLE && (
          <>
            <GridPattern width={28} height={28} className="entity-bg-grid" />
            <div className="entity-bg-scan" />
          </>
        )}

      </div>

      {/* Sello de evidencia — no es decorativo (por eso vive fuera del div
       *  aria-hidden de arriba), es la misma pieza de información que ya
       *  vio el usuario en la card. Mismas clases/rotación que
       *  `EntityCard` para que el ojo la reconozca como "la misma cosa"
       *  en vez de un elemento nuevo de la ficha. */}
      {evidenceStamp && (
        <span
          className={cn(
            'absolute right-4 top-4 z-10 inline-flex -rotate-3 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm sm:right-6 sm:top-6',
            evidenceStamp.className
          )}
          title="Nivel de evidencia — ver detalle en la sección Evidencia"
        >
          <span aria-hidden="true">{evidenceStamp.icon}</span>
          {evidenceStamp.shortLabel}
        </span>
      )}
    </>
  )
}
