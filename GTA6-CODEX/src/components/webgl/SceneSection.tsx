'use client'

import { ReactNode } from 'react'
import { useSectionSceneFocus } from '@/lib/hooks/useSectionSceneFocus'

interface SceneSectionProps {
  /** Id semántico para el motor WebGL (ej. "categories"). Distinto del id HTML. */
  sceneId: string
  children: ReactNode
  className?: string
  /** Id HTML real, para anclas/CSS existentes (independiente de `sceneId`). */
  htmlId?: string
}

/**
 * Renderiza un `<section>` idéntico al que reemplaza (mismo tag, misma
 * clase, mismos hijos) y únicamente agrega el sensor de visibilidad que
 * alimenta al motor WebGL. No modifica contenido ni funcionalidad de la
 * sección — es puramente instrumentación.
 */
export function SceneSection({ sceneId, children, className, htmlId }: SceneSectionProps) {
  const ref = useSectionSceneFocus<HTMLElement>(sceneId)
  return (
    <section ref={ref} id={htmlId} className={className} data-scene-section={sceneId}>
      {children}
    </section>
  )
}
