/**
 * Atmospheric haze builder for the AutoFicha WebGL engine.
 * Capas de haze volumétrico con parallax por profundidad.
 */

import * as THREE from 'three'
import { HAZE_VERTEX_SHADER, HAZE_FRAGMENT_SHADER } from '../shaders/particles'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface AtmosphericHazeBuilderOptions {
  midGroup: THREE.Group
  quality: QualityProfile
}

export interface AtmosphericHazeBuildResult {
  /**
   * Capas construidas, expuestas para que el llamador aplique el ajuste de
   * posición Y dependiente de `scrollProgress` — estado propio del motor,
   * no del `Updater` de 11 parámetros (ver nota de arquitectura en
   * engine.ts).
   */
  layers: THREE.Mesh[]
  updater: Updater
}

/**
 * Construye las capas de haze volumétrico en profundidad sobre `midGroup`.
 * Genera N `THREE.Mesh` (uno por capa, según `quality.hazeLayers`) con
 * `ShaderMaterial` aditivo. Devuelve `{ layers, updater }`: `layers` para
 * que el llamador aplique el parallax de scroll externo, `updater:
 * Updater` (firma común de 11 parámetros) para el loop de animación.
 */
export function buildAtmosphericHaze(options: AtmosphericHazeBuilderOptions): AtmosphericHazeBuildResult {
  const { midGroup, quality } = options

  const layers: THREE.Mesh[] = []
  const layerUpdaters: Array<(elapsed: number, intro: number) => void> = []

  for (let i = 0; i < quality.hazeLayers; i++) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        introFade: { value: 0 },
        hazeColor: { value: new THREE.Color(i % 2 === 0 ? 0x454545 : 0x424242) },
        layerSeed: { value: i * 1.73 },
      },
      vertexShader: HAZE_VERTEX_SHADER,
      fragmentShader: HAZE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(90 + i * 20, 35, 1, 1), mat)
    mesh.position.set(0, -2 + i * 2.5, -18 - i * 12)
    midGroup.add(mesh)
    layers.push(mesh)

    // Referencias cacheadas (evita re-atravesar `mat.uniforms.<nombre>` y
    // `mesh.position` en cada frame dentro del closure de abajo — mismo
    // criterio aplicado en el resto de `scene/*.ts`). `amplitude` no
    // depende de ningún valor que cambie por frame (solo de `i`, fijo
    // para esta capa), así que se calcula una sola vez acá.
    const timeUniform = mat.uniforms.time
    const introFadeUniform = mat.uniforms.introFade
    const meshPosition = mesh.position
    const amplitude = 1.2 + i * 0.4

    layerUpdaters.push((elapsed, intro) => {
      timeUniform.value = elapsed
      introFadeUniform.value = intro
      meshPosition.x = Math.sin(elapsed * 0.03 + i) * amplitude
    })
  }

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    layerUpdaters.forEach((fn) => fn(elapsed, intro))
  }

  return { layers, updater }
}
