/**
 * Dust particles builder for the AutoFicha WebGL engine.
 * Partículas de polvo/bruma en el plano medio, reactivas a la luz cálida
 * (`keyLight`) y fría (`fillLight`), y al puntero (`mouseNDC`/`mouseStrength`,
 * actualizados en el loop de `start()` en `engine.ts`).
 */

import * as THREE from 'three'
import { DUST_VERTEX_SHADER, DUST_FRAGMENT_SHADER } from '../shaders/particles'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface DustUniforms {
  time: { value: number }
  mouseNDC: { value: THREE.Vector2 }
  mouseStrength: { value: number }
  warmLightPos: { value: THREE.Vector3 }
  coolLightPos: { value: THREE.Vector3 }
  introFade: { value: number }
}

export interface DustBuilderOptions {
  midGroup: THREE.Group
  quality: QualityProfile
  reducedMotion: boolean
  keyLight: THREE.PointLight
  fillLight: THREE.PointLight
}

/**
 * Construye las partículas de polvo/bruma del plano medio sobre `midGroup`.
 * Genera un `THREE.Points` con geometría de buffer (`quality.dustCount`
 * partículas) y sus uniforms de reacción a luz/puntero. Devuelve
 * `{ uniforms, updater }`; `updater: Updater` sigue en vivo la posición de
 * `keyLight`/`fillLight`, recibidas como dependencia de construcción.
 */
export function buildDust(
  options: DustBuilderOptions
): { uniforms: DustUniforms; updater: Updater } {
  const { midGroup, quality, reducedMotion, keyLight, fillLight } = options

  const COUNT = quality.dustCount
  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3
    positions[i3] = (Math.random() - 0.5) * 55
    positions[i3 + 1] = (Math.random() - 0.5) * 36
    positions[i3 + 2] = (Math.random() - 0.5) * 46 - 8

    seeds[i3] = Math.random() * Math.PI * 2
    seeds[i3 + 1] = reducedMotion ? 0.02 : 0.12 + Math.random() * 0.25
    seeds[i3 + 2] = reducedMotion ? 0.05 : 0.4 + Math.random() * 1.8

    sizes[i] = 5 + Math.random() * 8
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

  const uniforms: DustUniforms = {
    time: { value: 0 },
    mouseNDC: { value: new THREE.Vector2(2, 2) },
    mouseStrength: { value: reducedMotion ? 0 : 1 },
    warmLightPos: { value: keyLight.position.clone() },
    coolLightPos: { value: fillLight.position.clone() },
    introFade: { value: 0 },
  }

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      warmColor: { value: new THREE.Color(0xff6fa8) },
      coolColor: { value: new THREE.Color(0x22d3ee) },
    },
    vertexShader: DUST_VERTEX_SHADER,
    fragmentShader: DUST_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geometry, material)
  midGroup.add(points)

  // Referencias cacheadas (evita re-atravesar las cadenas
  // `uniforms.X.value` y `keyLight.position`/`fillLight.position` en
  // cada frame dentro del updater — mismo criterio aplicado en
  // `scene/road.ts` y `scene/image-billboards.ts`).
  const warmLightPosValue = uniforms.warmLightPos.value
  const coolLightPosValue = uniforms.coolLightPos.value
  const keyLightPosition = keyLight.position
  const fillLightPosition = fillLight.position

  const updater: Updater = (elapsed, _delta, _intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    points.rotation.y = elapsed * 0.008
    warmLightPosValue.copy(keyLightPosition)
    coolLightPosValue.copy(fillLightPosition)
  }

  return { uniforms, updater }
}
