'use client'

import { memo, type ReactNode } from 'react'

/**
 * `SceneSection` — wrapper semántico de `<section>`, usado en la ficha de
 * vehículo (`entity-header` / `entity-content`, ver
 * `src/app/[entityType]/[slug]/page.tsx`).
 *
 * Historial: nació como el conducto entre la UI y el motor WebGL de fondo
 * (`src/lib/webgl/*`, `webglSceneBus`, `useSectionSceneFocus`, los
 * *bridges* de telemetría): instrumentaba la sección con un sensor de
 * visibilidad que publicaba foco/progreso para que el motor resolviera
 * mood/cámara/partículas, y exponía por separado `data-scene-section` y
 * `data-scene-engine-id` para quien ya lo leyera/estilizara desde CSS.
 *
 * Con la limpieza heredada del motor WebGL/choreo (ver
 * `docs/spike-4-1-motor-webgl-choreo-2026-09.md`) todo esa infraestructura
 * quedó desconectada del árbol de render y fue eliminada. Este componente
 * NO se borró porque sigue en uso real como envoltorio semántico — pero ya
 * no hay motor al cual instrumentar: queda como `<section>` plano con el
 * atributo `data-scene-section` que los consumidores externos ya leen. Se
 * eliminaron `onFocusChange` (API que reportaba foco vía el bus del motor,
 * hoy inexistente; ningún caller real la usaba) y `data-scene-engine-id`
 * (vocabulario del motor, sin ningún lector en el árbol actual).
 */

interface SceneSectionProps {
  /** Id semántico de la sección, expuesto como `data-scene-section` (anclas/CSS). */
  sceneId: string
  children: ReactNode
  className?: string
  /** Id HTML real, para anclas/CSS existentes (independiente de `sceneId`). */
  htmlId?: string
}

function SceneSectionComponent({ sceneId, children, className, htmlId }: SceneSectionProps) {
  return (
    <section id={htmlId} className={className} data-scene-section={sceneId}>
      {children}
    </section>
  )
}

SceneSectionComponent.displayName = 'SceneSection'

/**
 * `memo`: evita re-renders cuando el padre se vuelve a renderizar pero las
 * props de esta sección (sceneId/className/htmlId/children) no cambiaron por
 * referencia — la sección no tiene estado propio.
 */
export const SceneSection = memo(SceneSectionComponent)