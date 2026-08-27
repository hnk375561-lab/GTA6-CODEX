'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

/**
 * Scroll con inercia estilo rockstargames.com/VI.
 *
 * Decisiones de diseño, para quien vuelva a esto después:
 *
 * 1. Lenis se configura en su modo "estándar" (sin `wrapper`/`content`
 *    propios ni `syncTouch`/virtualización): sigue moviendo el scroll
 *    *real* del documento vía rAF, solo que interpolado. Esto es
 *    deliberado — `useSectionSceneFocus` (IntersectionObserver) y las
 *    `animation-timeline: --hero-scroll` nativas en globals.css leen la
 *    posición real de scroll del documento. Si Lenis virtualizara el
 *    scroll (transform en un wrapper, scrollY clavado en 0), esas dos
 *    piezas se romperían en silencio. No cambiar `wrapper`/`content` sin
 *    revisar ambas.
 *
 * 2. `duration` + `easing` están afinados para la sensación "pesada" de
 *    Rockstar: no es el "ease-out" rápido y liviano de una lib por
 *    defecto, es una desaceleración larga (curva tipo exponencial) que
 *    da sensación de inercia real, no de "snap" instantáneo.
 *
 * 3. Se desactiva por completo si el usuario pidió `prefers-reduced-motion:
 *    reduce`. No es un "toggle suave": directamente no se instancia Lenis
 *    y el navegador vuelve a scroll nativo (gobernado por `scroll-behavior`
 *    en globals.css). Alguien que pidió menos movimiento no debería
 *    recibir inercia "atenuada": la inercia en sí es el efecto a evitar.
 *
 * 4. Se expone la instancia en `window.__lenis` (solo cliente) para que
 *    otros componentes (ej. `HeroScrollCue`, anclas internas) puedan
 *    pedir `lenis.scrollTo(...)` en vez de `scrollIntoView` nativo —
 *    mezclar ambos motores de scroll produce un "tironeo" perceptible.
 */
declare global {
  interface Window {
    __lenis?: Lenis
  }
}

export function LenisProvider() {
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) return

    const lenis = new Lenis({
      duration: 1.35,
      // Desaceleración larga y "pesada", no un ease-out genérico de
      // librería: sube rápido, tarda en soltar del todo.
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.3,
      syncTouch: false,
    })

    window.__lenis = lenis

    // `webglSceneBus.setScrollProgress(progress, velocity)` existía en el bus
    // desde antes (ver scene-bus.ts), documentado como "canal nuevo, listo
    // para un futuro hook de layout — hoy ningún archivo lo publica
    // todavía". Este es ese hook: cada tick de Lenis publica el progreso
    // global de página (0..1) y la velocidad instantánea real de scroll
    // (no una derivada diferida de una posición ya suavizada). Puramente
    // aditivo — nadie consumía este canal antes, así que conectarlo no
    // cambia el comportamiento de ningún componente existente. Motor WebGL
    // y cualquier componente DOM futuro (ScrollTelemetryBridge, headers,
    // indicadores) pueden ahora leer `webglSceneBus.getSnapshot().scroll`
    // o suscribirse con `webglSceneBus.subscribe(...)`.
    lenis.on('scroll', (instance) => {
      webglSceneBus.setScrollProgress(instance.progress, instance.velocity)
    })

    function raf(time: number) {
      lenis.raf(time)
      rafId.current = requestAnimationFrame(raf)
    }
    rafId.current = requestAnimationFrame(raf)

    // Si el usuario cambia la preferencia en vivo (raro, pero posible en
    // el panel de accesibilidad del SO sin recargar), no queda una
    // instancia de Lenis corriendo de más.
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) {
        if (rafId.current) cancelAnimationFrame(rafId.current)
        lenis.destroy()
        window.__lenis = undefined
      }
    }
    media.addEventListener('change', handleChange)

    return () => {
      media.removeEventListener('change', handleChange)
      if (rafId.current) cancelAnimationFrame(rafId.current)
      lenis.destroy()
      window.__lenis = undefined
    }
  }, [])

  return null
}

/**
 * Scrollea suave a un elemento o posición usando Lenis si está activo
 * (motion normal), o `scrollIntoView`/`scrollTo` nativo si Lenis está
 * desactivado (reduced-motion o antes de montar). Usar esto en vez de
 * `element.scrollIntoView({ behavior: 'smooth' })` en cualquier lugar
 * nuevo del sitio para no mezclar dos motores de scroll a la vez.
 */
export function smoothScrollTo(
  target: HTMLElement | number | string,
  options?: { offset?: number }
) {
  const lenis = window.__lenis
  if (lenis) {
    lenis.scrollTo(target, { offset: options?.offset ?? 0 })
    return
  }

  if (typeof target === 'number') {
    window.scrollTo({ top: target + (options?.offset ?? 0), behavior: 'smooth' })
    return
  }

  const el =
    typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
