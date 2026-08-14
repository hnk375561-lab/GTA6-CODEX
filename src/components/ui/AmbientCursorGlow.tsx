'use client'

import { useAmbientGlow } from '@/lib/hooks/useAmbientGlow'

/**
 * Iluminación ambiental sutil que sigue al cursor en desktop.
 * No es un "círculo pegado al mouse": es un halo grande, de bajo
 * contraste, fixed detrás del contenido (z-index bajo, pointer-events: none).
 * Se apaga solo vía CSS en touch/mobile (hover: none) y respeta
 * prefers-reduced-motion (el hook directamente no se suscribe en ese caso,
 * dejando el glow inmóvil en su posición inicial y sin listeners activos).
 */
export function AmbientCursorGlow() {
  const ref = useAmbientGlow<HTMLDivElement>()

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="ambient-cursor-glow"
      style={
        {
          '--glow-x': '50%',
          '--glow-y': '30%',
        } as React.CSSProperties
      }
    />
  )
}
