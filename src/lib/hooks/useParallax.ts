'use client'

import { useEffect, useRef } from 'react'
import { hasFinePointer, prefersReducedMotion } from '@/lib/utils'

/**
 * Aplica un parallax vertical muy sutil (transform: translateY) a un
 * elemento decorativo de fondo mientras el usuario scrollea, acotado a
 * `maxOffset` px. Pensado para capas de fondo, nunca para contenido
 * principal (texto, CTA).
 *
 * Desactivado por completo en:
 *  - viewport < 768px (mobile/tablet chico)
 *  - sin puntero fino (touch)
 *  - prefers-reduced-motion
 *
 * Usa un solo scroll listener pasivo + requestAnimationFrame throttle,
 * y solo transform (sin recalcular layout).
 */
export function useParallax<T extends HTMLElement>(maxOffset = 10) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!hasFinePointer() || prefersReducedMotion()) return
    if (window.matchMedia('(max-width: 767px)').matches) return

    let frame: number | null = null
    let sectionTop = 0
    let sectionHeight = 0

    const measure = () => {
      const rect = el.parentElement?.getBoundingClientRect()
      sectionTop = window.scrollY + (rect?.top ?? 0)
      sectionHeight = rect?.height ?? window.innerHeight
    }

    const apply = () => {
      frame = null
      const progress = (window.scrollY - sectionTop + sectionHeight) / sectionHeight
      const clamped = Math.min(Math.max(progress, 0), 1)
      const offset = (clamped - 0.5) * 2 * maxOffset
      el.style.transform = `translateY(${offset.toFixed(1)}px)`
    }

    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(apply)
    }

    measure()
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [maxOffset])

  return ref
}
