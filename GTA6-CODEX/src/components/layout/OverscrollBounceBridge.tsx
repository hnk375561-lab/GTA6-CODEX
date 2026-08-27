'use client'

import { useEffect, useRef } from 'react'

/**
 * Capítulo 8.2 — rebote en los extremos (ver biblia-scroll-rockstar.txt).
 * "Lenis lo soporta, no está configurado hoy" resultó ser impreciso: la
 * opción `overscroll` de Lenis (ver node_modules/lenis/dist/lenis.d.ts)
 * es para permitir/bloquear scroll-chaining hacia un padre en instancias
 * ANIDADAS de Lenis — no existe un rebote elástico nativo tipo iOS/rubber-
 * band en la librería. Y como `LenisProvider` intercepta la rueda/gestos
 * para controlar el scroll él mismo (`smoothWheel`), el rebote elástico
 * NATIVO del navegador en los extremos (el que el sistema operativo daría
 * gratis en trackpad/touch) queda efectivamente anulado también. Sin
 * código nuevo acá, "al llegar al final/tope" hoy es un corte seco, tal
 * cual describe la biblia.
 *
 * Este componente simula ese rebote a mano, sin tocar el wrapper de
 * scroll de Lenis (`lenis-provider.tsx` documenta explícitamente que
 * `useSectionSceneFocus`/`--hero-scroll` dependen de que ese wrapper NO
 * se toque). En cambio, anima un `transform: translateY` transitorio
 * sobre el wrapper de CONTENIDO (`#page-content` en layout.tsx, z-10) —
 * un nodo puramente visual, hermano del canvas WebGL (z-0) y el overlay
 * de atmósfera (z-1), que no participa en ningún cálculo de scroll real.
 * El `scrollTop` del documento nunca se toca: solo se "estira" lo que se
 * VE, exactamente como el rebote nativo que estamos reemplazando.
 *
 * Solo escucha `wheel` (trackpad/mouse) a propósito: es la señal más
 * limpia para detectar "la persona sigue empujando contra un límite" sin
 * necesitar los deltas synthetic de touch (`touchmove`/`touchend`) que
 * además ya reciben su propio manejo especial de Lenis. Dejar el rebote
 * táctil para una pasada aparte si hace falta, en vez de forzarlo acá con
 * heurísticas de touch más frágiles.
 */
const MAX_PULL_PX = 26
const PULL_GAIN = 0.4
const IDLE_RESET_DELAY_MS = 120
const SPRING_BACK_MS = 420

export function OverscrollBounceBridge() {
  const pullRef = useRef(0)

  useEffect(() => {
    const content = document.getElementById('page-content')
    if (!content) return

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mql.matches) return

    let resetTimeoutId: number | undefined
    let settled = true

    const applyPull = (value: number, animated: boolean) => {
      pullRef.current = value
      content.style.transition = animated
        ? `transform ${SPRING_BACK_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        : 'none'
      content.style.transform = value === 0 ? '' : `translateY(${value.toFixed(1)}px)`
    }

    const scheduleSpringBack = () => {
      window.clearTimeout(resetTimeoutId)
      resetTimeoutId = window.setTimeout(() => {
        settled = true
        applyPull(0, true)
      }, IDLE_RESET_DELAY_MS)
    }

    const handleWheel = (event: WheelEvent) => {
      const doc = document.documentElement
      const maxScroll = doc.scrollHeight - doc.clientHeight
      const atTop = window.scrollY <= 0
      // -1px de margen: alturas fraccionarias (zoom del navegador, DPR no
      // entero) a veces dejan scrollY en maxScroll - 0.3, nunca exacto.
      const atBottom = maxScroll <= 0 || window.scrollY >= maxScroll - 1

      const pushingPastTop = atTop && event.deltaY < 0
      const pushingPastBottom = atBottom && event.deltaY > 0

      if (!pushingPastTop && !pushingPastBottom) {
        if (!settled) scheduleSpringBack()
        return
      }

      settled = false
      window.clearTimeout(resetTimeoutId)

      // Positivo empuja el contenido hacia abajo (tope: se "despega" hacia
      // abajo, como si algo lo sostuviera desde arriba); negativo lo tira
      // hacia arriba (fondo). `Math.min(|deltaY|, 24)` acota cuánto aporta
      // un solo evento de rueda — un trackpad con inercia fuerte dispara
      // deltas grandes que si no se acotan, saturan el pull de un solo
      // frame en vez de sentirse progresivo.
      const direction = pushingPastTop ? 1 : -1
      const step = Math.min(Math.abs(event.deltaY), 24) * PULL_GAIN
      const next = Math.max(-MAX_PULL_PX, Math.min(MAX_PULL_PX, pullRef.current + direction * step))

      applyPull(next, false)
      scheduleSpringBack()
    }

    window.addEventListener('wheel', handleWheel, { passive: true })

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        window.removeEventListener('wheel', handleWheel)
        window.clearTimeout(resetTimeoutId)
        applyPull(0, false)
      }
    }
    mql.addEventListener('change', handleReducedMotionChange)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      mql.removeEventListener('change', handleReducedMotionChange)
      window.clearTimeout(resetTimeoutId)
      content.style.transition = ''
      content.style.transform = ''
    }
  }, [])

  return null
}
