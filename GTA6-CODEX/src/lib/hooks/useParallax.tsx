'use client'

import { useEffect, useRef, ReactNode } from 'react'

/**
 * Capítulo 2.2 — Parallax en el DOM
 *
 * Hook que implementa parallax LIVIANO en elementos post-hero.
 * Usa IntersectionObserver para detectar entrada en viewport,
 * calcula scrollProgress y publica --parallax-offset vía CSS var.
 *
 * Factores por tipo:
 *   - media/imágenes: 0.25 (se mueve 25% de lo scrolleado)
 *   - texto: 0.1 (sutil)
 *   - cards: 0.15 (intermedio)
 */

interface UseParallaxOptions {
  factor?: number
  respectReducedMotion?: boolean
}

export function useParallax<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options: UseParallaxOptions = {}
) {
  const { factor = 0.15, respectReducedMotion = true } = options

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (respectReducedMotion) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      if (mediaQuery.matches) return
    }

    let scrollProgress = 0
    let elementTop = 0
    let elementHeight = 0

    const updatePosition = () => {
      const rect = element.getBoundingClientRect()
      elementTop = window.scrollY + rect.top
      elementHeight = rect.height
    }

    const observer = new IntersectionObserver(
      () => {
        updatePosition()
      },
      { threshold: 0 }
    )

    observer.observe(element)

    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const scrollY = window.scrollY

      const elementStartInViewport = elementTop - windowHeight
      const elementEndInViewport = elementTop + elementHeight

      if (scrollY < elementStartInViewport || scrollY > elementEndInViewport) {
        scrollProgress = 0
      } else {
        const progress =
          (scrollY - elementStartInViewport) /
          (elementEndInViewport - elementStartInViewport + windowHeight)
        scrollProgress = Math.max(0, Math.min(1, progress))
      }

      // Capítulo 1.1 (fases con nombre) aplicado acá: en "invitación" (CTA
      // final, ver ScrollTelemetryBridge/data-scroll-phase) el parallax se
      // atenúa a 40% de su intensidad normal — mismo criterio que ya se
      // usó en el grano reactivo a velocidad (globals.css): ese tramo está
      // pensado para que la persona lea tranquila, no para que el fondo
      // siga "trabajando" a intensidad completa. `getAttribute` es una
      // lectura sincrónica barata, sin costo real dentro de un handler de
      // scroll ya throttleado por el propio evento del navegador.
      const phase = document.documentElement.getAttribute('data-scroll-phase')
      const phaseDamping = phase === 'invitacion' ? 0.4 : 1

      const offset = scrollProgress * factor * phaseDamping * windowHeight * -1
      element.style.setProperty('--parallax-offset', `${offset}px`)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    updatePosition()
    handleScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [factor, respectReducedMotion])
}

interface ParallaxElementProps {
  children: ReactNode
  factor?: number
  className?: string
  respectReducedMotion?: boolean
}

export function ParallaxElement({
  children,
  factor = 0.15,
  className = '',
  respectReducedMotion = true,
}: ParallaxElementProps) {
  const ref = useRef<HTMLDivElement>(null)
  useParallax(ref, { factor, respectReducedMotion })

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: 'translateY(var(--parallax-offset, 0px))',
        transition: 'transform 0.1s ease-out',
      }}
    >
      {children}
    </div>
  )
}
