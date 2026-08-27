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
 * También publica las señales derivadas de esas mismas 5 (`hueShiftDeg`,
 * `particleDensity`, `depth`, `saturation` — ver `deriveAmbientSignals` en
 * `scene-bus.ts`), calculadas desde hace tiempo pero sin ningún bridge que
 * las escribiera todavía.
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
      // Señales derivadas de `deriveAmbientSignals` (scene-bus.ts): estaban
      // calculadas desde que se agregó `SceneAmbientSignals`, pero ningún
      // bridge las escribía todavía — quedaban "listas pero inertes". Las
      // publicamos con el mismo criterio que las 5 de arriba (variable CSS
      // en <html>, sin useState) para que el DOM pueda reaccionar a matiz/
      // densidad de partícula/profundidad/saturación reales de la escena,
      // no solo a luz/temperatura/intro/kick.
      root.style.setProperty('--scene-hue-shift', `${ambient.hueShiftDeg.toFixed(1)}deg`)
      root.style.setProperty('--scene-particle-density', ambient.particleDensity.toFixed(3))
      root.style.setProperty('--scene-depth', ambient.depth.toFixed(3))
      root.style.setProperty('--scene-saturation', ambient.saturation.toFixed(3))
    })
    return unsubscribe
  }, [])

  return null
}
