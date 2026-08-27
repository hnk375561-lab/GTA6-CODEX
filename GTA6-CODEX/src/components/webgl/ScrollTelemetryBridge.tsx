'use client'

import { useEffect } from 'react'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

/**
 * Mitad "scroll real → DOM" del puente de scroll, hermana de
 * `SceneAmbientBridge` (que hace "motor WebGL → DOM"). Antes del scroll con
 * inercia (`LenisProvider`), `ScrollTelemetry` en `scene-bus.ts` era un
 * canal "listo pero inerte": nadie lo publicaba ni lo leía. Ahora que
 * `LenisProvider` lo alimenta con velocidad real de Lenis en cada tick, este
 * puente lo escribe como variables CSS en `<html>` para que CUALQUIER
 * superficie del sitio — no solo el canvas WebGL del hero, que se pausa
 * fuera de rango por diseño (ver `HERO_SCROLL_RANGE_VH` en
 * `core/input.ts`) — pueda reaccionar a qué tan rápido y en qué dirección
 * está scrolleando la persona, en toda la página.
 *
 * `--scroll-speed`: 0..1, normalizado contra `MAX_EXPECTED_VELOCITY` (px de
 * Lenis por tick). Un scroll de rueda normal ronda 0.1–0.3; un "flick"
 * fuerte de trackpad/inercia llega cerca de 1. El propio decaimiento de la
 * inercia de Lenis hace que este valor baje solo, sin decay manual acá.
 *
 * `--scroll-dir`: -1 (subiendo), 0 (quieto), 1 (bajando) — mismo lenguaje
 * que `ScrollTelemetry.direction`.
 *
 * Igual que `SceneAmbientBridge`, escribe `style.setProperty` directo
 * (nada de `useState`): esto cambia varias veces por segundo mientras se
 * scrollea y no debe disparar el ciclo de render de React.
 */
const MAX_EXPECTED_VELOCITY = 60

export function ScrollTelemetryBridge() {
  useEffect(() => {
    const root = document.documentElement
    const unsubscribe = webglSceneBus.subscribe(() => {
      const { scroll } = webglSceneBus.getSnapshot()
      const speed = Math.min(Math.abs(scroll.velocity) / MAX_EXPECTED_VELOCITY, 1)
      root.style.setProperty('--scroll-speed', speed.toFixed(3))
      root.style.setProperty('--scroll-dir', String(scroll.direction))
    })
    return unsubscribe
  }, [])

  return null
}
