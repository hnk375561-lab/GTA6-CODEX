/**
 * Fireflies builder for the GTA6 Codex WebGL engine.
 * Luciérnagas tropicales cerca del skyline.
 */

import * as THREE from 'three'
import { FIREFLY_VERTEX_SHADER, FIREFLY_FRAGMENT_SHADER } from '../shaders/particles'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface FirefliesBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

/**
 * Construye las luciérnagas tropicales cerca del skyline, sobre
 * `farGroup`. Genera un `THREE.Points` con `quality.fireflyCount`
 * partículas (o ningún recurso si la cuenta es 0). Devuelve un único
 * `updater: Updater` que anima tiempo e intro del shader.
 */
export function buildFireflies(options: FirefliesBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.fireflyCount <= 0) {
    return () => {}
  }

  const COUNT = quality.fireflyCount
  const positions = new Float32Array(COUNT * 3)
  const phases = new Float32Array(COUNT)
  const speeds = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50
    positions[i * 3 + 1] = -6 + Math.random() * 14
    positions[i * 3 + 2] = -20 - Math.random() * 25
    phases[i] = Math.random() * Math.PI * 2
    speeds[i] = 0.15 + Math.random() * 0.35
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))

  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, introFade: { value: 0 } },
    vertexShader: FIREFLY_VERTEX_SHADER,
    fragmentShader: FIREFLY_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  farGroup.add(new THREE.Points(geo, mat))

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    mat.uniforms.time.value = elapsed
    mat.uniforms.introFade.value = intro
  }

  return updater
}
