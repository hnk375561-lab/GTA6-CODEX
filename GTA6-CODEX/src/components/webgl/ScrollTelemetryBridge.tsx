'use client'

import { useEffect } from 'react'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

/**
 * Mitad "scroll real → DOM" del puente de scroll, hermana de
 * `SceneAmbientBridge` (que hace "motor WebGL → DOM"). `ScrollTelemetry` en
 * `scene-bus.ts` la alimenta `ScrollTelemetryProvider`
 * (`scroll-telemetry.tsx`) con la velocidad REAL de la rueda/trackpad —
 * sitio estático, sin motor de scroll propio de por medio — y este puente
 * la escribe como variables CSS en `<html>` para que CUALQUIER superficie
 * del sitio — no solo el canvas WebGL del hero, que se pausa fuera de rango
 * por diseño (ver `HERO_SCROLL_RANGE_VH` en `core/input.ts`) — pueda
 * reaccionar a qué tan rápido y en qué dirección está scrolleando la
 * persona, en toda la página. Puramente decorativo (grano fílmico, fondo
 * WebGL): no mueve el documento ni el contenido.
 *
 * `--scroll-speed`: 0..1, normalizado contra `MAX_EXPECTED_VELOCITY`
 * (px/tick equivalentes). Un scroll de rueda normal ronda 0.1–0.3; un
 * "flick" fuerte de trackpad llega cerca de 1. Sin inercia artificial de
 * por medio, este valor baja apenas se detiene la rueda — no hay decay que
 * lo mantenga alto un rato más.
 *
 * `--scroll-dir`: -1 (subiendo), 0 (quieto), 1 (bajando) — mismo lenguaje
 * que `ScrollTelemetry.direction`.
 *
 * Igual que `SceneAmbientBridge`, escribe `style.setProperty` directo
 * (nada de `useState`): esto cambia varias veces por segundo mientras se
 * scrollea y no debe disparar el ciclo de render de React.
 */
/**
 * Capítulo 1.1 — timeline maestra de scroll, "fases con nombre" extendidas
 * a toda la página (antes solo vivía en el hero, atada a
 * `HERO_SCROLL_RANGE_VH`). Mismos cuatro tramos que describe la biblia,
 * mapeados directo sobre `scroll.progress` (0..1 de la página entera,
 * publicado por `ScrollTelemetryProvider` vía `webglSceneBus.setScrollProgress`
 * — ver `scroll-telemetry.tsx`): 0–15% despertar, 15–40% presentación,
 * 40–70% inmersión, 70–100% invitación. Es deliberadamente la misma señal
 * que ya alimenta `--scroll-speed`/`--scroll-dir` acá abajo, no un cálculo
 * nuevo en paralelo — una sola fuente de verdad para "en qué parte del
 * recorrido está la persona".
 */
const PHASE_THRESHOLDS = {
  despertar: 0,
  presentacion: 0.15,
  inmersion: 0.4,
  invitacion: 0.7,
} as const

function phaseForProgress(progress: number): keyof typeof PHASE_THRESHOLDS {
  if (progress >= PHASE_THRESHOLDS.invitacion) return 'invitacion'
  if (progress >= PHASE_THRESHOLDS.inmersion) return 'inmersion'
  if (progress >= PHASE_THRESHOLDS.presentacion) return 'presentacion'
  return 'despertar'
}

const MAX_EXPECTED_VELOCITY = 60

export function ScrollTelemetryBridge() {
  useEffect(() => {
    const root = document.documentElement
    let lastPhase: string | null = null
    const unsubscribe = webglSceneBus.subscribe(() => {
      const { scroll } = webglSceneBus.getSnapshot()
      const speed = Math.min(Math.abs(scroll.velocity) / MAX_EXPECTED_VELOCITY, 1)
      root.style.setProperty('--scroll-speed', speed.toFixed(3))
      root.style.setProperty('--scroll-dir', String(scroll.direction))

      // El atributo (no una custom property) es a propósito: permite
      // selectores CSS normales (`[data-scroll-phase="invitacion"]`) sin
      // depender de `@container style()` (soporte todavía parcial) para
      // ramificar reglas enteras por fase, no solo interpolar un número.
      const phase = phaseForProgress(scroll.progress)
      if (phase !== lastPhase) {
        lastPhase = phase
        root.setAttribute('data-scroll-phase', phase)
      }
    })
    return unsubscribe
  }, [])

  return null
}
