'use client'

import { useEffect, useRef } from 'react'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

/**
 * Observa qué tan visible está una sección real (no un porcentaje de scroll
 * de toda la página) y lo publica en el scene-bus para que el motor WebGL
 * pueda reaccionar a la UI real: hero, grid de categorías, destacados, etc.
 *
 * Devuelve un `ref` para adjuntar al elemento de la sección; no cambia
 * markup, estilos ni comportamiento propios de esa sección.
 */
export function useSectionSceneFocus<T extends HTMLElement>(sectionId: string) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Umbrales finos: queremos progreso continuo (0..1), no solo un booleano
    // de "está en pantalla".
    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20)

    const observer = new IntersectionObserver(
      ([entry]) => {
        webglSceneBus.setSectionFocus(sectionId, entry.intersectionRatio)
      },
      { threshold: thresholds }
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      // Si la sección se desmonta, que no quede "pegada" como foco activo.
      webglSceneBus.setSectionFocus(sectionId, 0)
    }
  }, [sectionId])

  return ref
}
