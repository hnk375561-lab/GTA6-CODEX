'use client'

import { useEffect, useRef } from 'react'
import {
  computeSnapCatchDuration,
  isOutsideRearmZone,
  isWithinCaptureZone,
  snapCatchEasing,
} from '@/lib/scroll/scroll-snap'

/**
 * Capítulo 5.1 + 5.2 — snap de captura corta entre bloques "splash" (ver
 * `scroll-snap.ts` para el porqué de este approach en vez de CSS
 * `scroll-snap-type`).
 *
 * Uso: montar UNA instancia por borde que se quiere reforzar, pasando el
 * selector del elemento cuyo `top` es el punto de acomodo. Ejemplo real (la
 * transición hero → categorías que cita la biblia como caso de referencia):
 *
 *   <ScrollSnapCatch targetSelector='[data-scene-section="home-categories"]' />
 *
 * `SceneSection` ya escribe `data-scene-section` en cada sección real (ver
 * `SceneSection.tsx`), así que no hace falta ningún ref ni prop nueva ahí —
 * este componente solo lee el DOM que ya existe, igual que hacen
 * `ChoreoTelemetryBridge`/`ScrollTelemetryBridge` con `window.scrollY`.
 *
 * No monta nada visual (`return null`) y es deliberadamente NO global: cada
 * página elige si lo usa y dónde. Eso es lo que garantiza 5.1 ("nunca en
 * contenido largo") sin necesitar una lista de exclusión — la home lo monta
 * en su transición splash; `/[entityType]`, `/[entityType]/[slug]` y
 * `/buscar` simplemente no lo importan.
 */
interface ScrollSnapCatchProps {
  /** Selector CSS del elemento cuyo borde superior es el punto de acomodo. */
  targetSelector: string
}

export function ScrollSnapCatch({ targetSelector }: ScrollSnapCatchProps) {
  // Evita que un cambio de identidad del string en cada render del padre
  // reinicie el efecto — el selector es efectivamente estático en la
  // práctica (viene de una constante en el JSX del caller).
  const selectorRef = useRef(targetSelector)
  selectorRef.current = targetSelector

  useEffect(() => {
    // Mismo criterio que `LenisProvider`: si el usuario pidió menos
    // movimiento, no instanciamos nada — no hay `window.__lenis` al que
    // pedirle un `scrollTo` suave, y forzar un salto seco tampoco tiene
    // sentido (el snap en sí es el efecto a evitar).
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReducedMotion) return

    let animationFrame: number
    // `armed`: si la próxima entrada a la zona de captura debe disparar el
    // acomodo. Arranca en `false` para no disparar en el primer frame si la
    // página ya carga posicionada dentro de la zona (ej. restauración de
    // scroll, ancla directa) — eso no es una aproximación real del usuario,
    // así que no corresponde "corregirla".
    let armed = false

    const evaluate = () => {
      const lenis = window.__lenis
      // Sin Lenis vivo (todavía no montó, se desactivó por reduced-motion
      // en caliente, etc.) no hay a quién pedirle el `scrollTo` suave.
      if (!lenis) return

      const target = document.querySelector<HTMLElement>(selectorRef.current)
      if (!target) return

      const boundaryY = target.getBoundingClientRect().top + window.scrollY
      const scrollY = window.scrollY

      if (!armed) {
        if (isOutsideRearmZone(scrollY, boundaryY)) armed = true
        return
      }

      if (!isWithinCaptureZone(scrollY, boundaryY)) return

      // Captura la velocidad de entrada UNA vez, al momento del disparo —
      // mismo idioma que `RevealText` en Capítulo 3.1 ("captura speed al
      // trigger, no recalcula cada frame"): la corrección ya está decidida,
      // no debe cambiar de duración a mitad de camino si `--scroll-speed`
      // sigue moviéndose durante la propia animación de acomodo.
      const speedRaw = getComputedStyle(document.documentElement).getPropertyValue(
        '--scroll-speed'
      )
      const speed = parseFloat(speedRaw) || 0
      const duration = computeSnapCatchDuration(speed)

      armed = false // consumida — no vuelve a disparar hasta rearmar (ver arriba)
      lenis.scrollTo(boundaryY, { duration, easing: snapCatchEasing })
    }

    const handleScroll = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(evaluate)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    evaluate()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return null
}
