/**
 * Particles builder for the GTA6 Codex WebGL engine.
 * Creates dust, fireflies, and mist particles.
 */

import * as THREE from 'three'
import { DUST_VERTEX_SHADER, DUST_FRAGMENT_SHADER, FIREFLY_VERTEX_SHADER, FIREFLY_FRAGMENT_SHADER, MIST_VERTEX_SHADER, MIST_FRAGMENT_SHADER } from '../shaders/particles'
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

export interface ParticlesBuilderOptions {
  midGroup: THREE.Group
  farGroup: THREE.Group
  quality: QualityProfile
  reducedMotion: boolean
  keyLight: THREE.PointLight
  fillLight: THREE.PointLight
}

export function buildDust(options: ParticlesBuilderOptions): { uniforms: DustUniforms; updater: Updater } {
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

  const updater: Updater = (elapsed, _delta, _intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    points.rotation.y = elapsed * 0.008
    uniforms.warmLightPos.value.copy(keyLight.position)
    uniforms.coolLightPos.value.copy(fillLight.position)
  }

  return { uniforms, updater }
}

export function buildFireflies(options: ParticlesBuilderOptions): Updater {
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

export function buildHumidityMist(options: { midGroup: THREE.Group; quality: QualityProfile; reducedMotion: boolean }): Updater {
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
