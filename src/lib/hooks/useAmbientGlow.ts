'use client'

import { useEffect, useRef } from 'react'
import { hasFinePointer, prefersReducedMotion } from '@/lib/utils'

/**
 * Escribe la posición del cursor como CSS custom properties (--glow-x/--glow-y)
 * en el elemento pasado, usando requestAnimationFrame para no disparar más
 * de un update por frame. No toca layout (solo custom properties leídas por
 * `background`/`transform` en CSS) y se desactiva por completo en:
 *  - touch / sin puntero fino (mobile, tablet)
 *  - prefers-reduced-motion
 *
 * El elemento objetivo debe consumir --glow-x/--glow-y vía CSS, por ejemplo:
 *   background: radial-gradient(600px circle at var(--glow-x) var(--glow-y), ...)
 */
export function useAmbientGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!hasFinePointer() || prefersReducedMotion()) return

    let frame: number | null = null
    let lastX = 0
    let lastY = 0

    const apply = () => {
      frame = null
      el.style.setProperty('--glow-x', `${lastX}px`)
      el.style.setProperty('--glow-y', `${lastY}px`)
    }

    const onMove = (e: MouseEvent) => {
      lastX = e.clientX
      lastY = e.clientY
      if (frame === null) {
        frame = requestAnimationFrame(apply)
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [])

  return ref
}
