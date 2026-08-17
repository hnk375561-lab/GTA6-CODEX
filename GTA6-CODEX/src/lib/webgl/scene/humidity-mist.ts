/**
 * Humidity mist builder for the GTA6 Codex WebGL engine.
 * Gotas de humedad/nocturnas — aire denso de Florida.
 */

import * as THREE from 'three'
import { MIST_VERTEX_SHADER, MIST_FRAGMENT_SHADER } from '../shaders/particles'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface HumidityMistBuilderOptions {
  midGroup: THREE.Group
  quality: QualityProfile
  reducedMotion: boolean
}

/**
 * Construye las gotas de humedad/niebla nocturna sobre `midGroup`. Genera
 * un `THREE.Points` con `quality.mistCount` partículas. Devuelve un único
 * `updater: Updater` que anima tiempo, amortiguado por `reducedMotion`.
 */
export function buildHumidityMist(options: HumidityMistBuilderOptions): Updater {
  const { midGroup, quality, reducedMotion } = options

  const COUNT = quality.mistCount
  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10
    seeds[i] = Math.random()
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, introFade: { value: 0 } },
    vertexShader: MIST_VERTEX_SHADER,
    fragmentShader: MIST_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  midGroup.add(new THREE.Points(geo, mat))

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    mat.uniforms.time.value = elapsed * (reducedMotion ? 0.2 : 1)
    mat.uniforms.introFade.value = intro
  }

  return updater
}
