'use client'

import { useEffect, useRef } from 'react'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

/**
 * Scroll 100% nativo del navegador. Sitio estático a propósito.
 *
 * Historial: este archivo instanciaba Lenis (`lenis-provider.tsx`) para dar
 * scroll "con inercia" estilo rockstargames.com/VI — la rueda soltaba y la
 * página seguía moviéndose sola un rato más, con una curva de desaceleración
 * larga. Pedido explícito: el sitio tiene que quedar ESTÁTICO. Mover la
 * rueda hacia abajo/arriba tiene que mover el documento exactamente eso,
 * nada más — ni inercia después de soltar, ni rebote elástico en los bordes
 * (ver `OverscrollBounceBridge`, eliminado), ni snap automático a un borde
 * de sección (ver `ScrollSnapCatch`/`scroll-snap.ts`, eliminados). El
 * "movimiento, vida, didacticidad" que sí se busca vive en el CONTENIDO
 * (los `<Reveal>` que aparecen una vez al entrar en viewport), no en el
 * documento moviéndose por su cuenta.
 *
 * Este componente NO toca el scroll en absoluto — no intercepta `wheel`, no
 * llama `scrollTo`, no envuelve nada. Es puramente un lector: escucha el
 * evento `scroll` nativo (rAF-throttled, un solo listener para toda la
 * sesión) y publica progreso/velocidad/dirección reales en
 * `webglSceneBus`, el mismo canal que ya alimentaba el motor WebGL de fondo
 * y el grano fílmico reactivo a velocidad (`ScrollTelemetryBridge`,
 * `--scroll-speed`/`--scroll-dir` en globals.css). Esos efectos son
 * decorativos de fondo (no mueven el documento ni el contenido), así que
 * siguen vivos — solo que ahora reaccionan a la velocidad REAL de la rueda,
 * sin el suavizado artificial que agregaba Lenis.
 */
export function ScrollTelemetryProvider() {
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReducedMotion) return

    let lastY = window.scrollY
    let lastT = performance.now()

    const publish = () => {
      const doc = document.documentElement
      const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1)
      const y = window.scrollY
      const t = performance.now()
      const dt = Math.max(t - lastT, 1)
      // px/ms → mismo lenguaje que la velocidad que ya publicaba Lenis
      // (magnitud comparable, ver MAX_EXPECTED_VELOCITY en
      // ScrollTelemetryBridge). Sin decay artificial: si la rueda se
      // detiene, el próximo evento 'scroll' directamente no llega y el
      // valor publicado queda clavado en la última velocidad real hasta
      // que vuelva a haber input — no hay animación de por medio.
      const velocity = ((y - lastY) / dt) * 16.6667
      lastY = y
      lastT = t
      webglSceneBus.setScrollProgress(y / maxScroll, velocity)
      rafId.current = null
    }

    const onScroll = () => {
      if (rafId.current == null) {
        rafId.current = requestAnimationFrame(publish)
      }
    }

    publish()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    }
  }, [])

  return null
}

/**
 * Scrollea a un elemento o posición. Antes delegaba en Lenis
 * (`window.__lenis.scrollTo`) para que el gesto tuviera la misma inercia
 * "pesada" que el resto del scroll; con el sitio ya estático no hay
 * segundo motor que igualar, así que esto es scroll nativo del navegador
 * (`scrollIntoView`/`scrollTo` con `behavior: 'smooth'`) — un salto puntual
 * y acotado, disparado explícitamente por una acción de la persona (click
 * en el botón de "seguir scrolleando", restauración de posición al volver
 * atrás), no un movimiento ambiental de la página. Se sigue centralizando
 * acá para que no convivan dos formas distintas de saltar a una posición.
 */
export function smoothScrollTo(
  target: HTMLElement | number | string,
  options?: { offset?: number }
) {
  if (typeof target === 'number') {
    window.scrollTo({ top: target + (options?.offset ?? 0), behavior: 'smooth' })
    return
  }

  const el =
    typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) return

  if (options?.offset) {
    const top = el.getBoundingClientRect().top + window.scrollY + options.offset
    window.scrollTo({ top, behavior: 'smooth' })
    return
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
