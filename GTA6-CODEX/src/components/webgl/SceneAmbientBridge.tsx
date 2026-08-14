'use client'

import { useEffect } from 'react'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

/**
 * Mitad "motor → DOM" del puente (ver `WebGLBackground` para el canvas y
 * `scene-bus.ts` para el contrato). El motor publica el ángulo de su luz
 * clave, la temperatura de color, la intensidad y el pulso de llegada a
 * cada sección; este componente los escribe como variables CSS en `<html>`
 * para que cards, hero y demás superficies del DOM reaccionen a la MISMA
 * luz que ilumina la escena 3D — no a un brillo estático inventado aparte.
 *
 * No usa `useState`: escribir `style.setProperty` directo evita que un
 * valor que cambia ~20 veces por segundo dispare el ciclo de render de
 * React. Es el mismo principio que ya usa el motor para leer scroll/pointer.
 */
export function SceneAmbientBridge() {
  useEffect(() => {
    const root = document.documentElement
    const unsubscribe = webglSceneBus.subscribeAmbient((ambient) => {
      root.style.setProperty('--scene-light-angle', `${ambient.lightAngleDeg.toFixed(1)}deg`)
      root.style.setProperty('--scene-warmth', ambient.warmth.toFixed(3))
      root.style.setProperty('--scene-intensity', ambient.intensity.toFixed(3))
      root.style.setProperty('--scene-kick', ambient.kick.toFixed(3))
      root.style.setProperty('--scene-intro', ambient.intro.toFixed(3))
    })
    return unsubscribe
  }, [])

  return null
}
