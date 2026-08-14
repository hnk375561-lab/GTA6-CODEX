import { EntityType } from '@/types'
import { GridPattern } from '@/components/ui/GridPattern'

interface EntityHeaderBackgroundProps {
  type: EntityType
}

/**
 * Fondo ambiental del header de una ficha, reservado a entidades `featured`
 * (Nivel 4 del sistema de motion: "entidad extremadamente importante").
 *
 * Un solo lenguaje visual común (grid + glow + scanline, todos ya usados en
 * el resto del sitio) con una variación de énfasis por categoría en vez de
 * seis fondos completamente distintos:
 *  - Personaje    → glow ambiental (retrato / presencia)
 *  - Vehículo     → grid técnico + sweep de escaneo horizontal
 *  - Ubicación    → grid amplio tipo mapa + marcas de coordenadas
 *  - Organización → líneas diagonales tenues tipo "expediente"
 *  - Resto        → glow genérico, sin acento adicional
 *
 * 100% CSS/SVG, sin canvas ni JS: coste ~cero incluso repetido en varias
 * fichas, y no compite con el contenido (opacidades muy bajas).
 */
export function EntityHeaderBackground({ type }: EntityHeaderBackgroundProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Glow ambiental base, común a todas las categorías */}
      <div className="entity-bg-glow" />

      {type === EntityType.VEHICLE && (
        <>
          <GridPattern width={28} height={28} className="entity-bg-grid" />
          <div className="entity-bg-scan" />
        </>
      )}

      {type === EntityType.LOCATION && (
        <>
          <GridPattern width={56} height={56} className="entity-bg-grid entity-bg-grid--wide" />
          <svg className="entity-bg-coords" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 8 H6 M2 4 V12" />
            <path d="M100 8 H94 M98 4 V12" />
            <path d="M0 92 H6 M2 88 V96" />
            <path d="M100 92 H94 M98 88 V96" />
          </svg>
        </>
      )}

      {type === EntityType.FACTION && <div className="entity-bg-dossier" />}
    </div>
  )
}
