/**
 * Neon signs builder for the GTA6 Codex WebGL engine.
 * Creates premium neon signs with organic flickering and day/night integration.
 */

import * as THREE from 'three'
import { SHAFT_VERTEX_SHADER, NEON_SIGN_FRAGMENT_SHADER } from '../shaders/neon'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface NeonSignsBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

export function buildNeonSigns(options: NeonSignsBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.tier === 'low') {
    return () => {}
  }

  const neonColors = [
    new THREE.Color(0xff2d78),
    new THREE.Color(0xff1744),
    new THREE.Color(0x22d3ee),
    new THREE.Color(0x9c27b0),
    new THREE.Color(0x2979ff),
    new THREE.Color(0xff9100),
    new THREE.Color(0xe91e63),
    new THREE.Color(0x00bcd4),
  ]

  interface SignConfig {
    type: number
    colorIndex: number
    width: number
    height: number
    baseIntensity: number
  }

  const signConfigs: SignConfig[] = [
    { type: 0, colorIndex: 0, width: 4.2, height: 1.8, baseIntensity: 0.6 },
    { type: 0, colorIndex: 3, width: 3.8, height: 1.6, baseIntensity: 0.55 },
    { type: 3, colorIndex: 4, width: 3.5, height: 1.4, baseIntensity: 0.5 },
    { type: 1, colorIndex: 1, width: 3.2, height: 1.2, baseIntensity: 0.75 },
    { type: 2, colorIndex: 2, width: 2.8, height: 1.0, baseIntensity: 0.7 },
    { type: 1, colorIndex: 5, width: 3.0, height: 1.1, baseIntensity: 0.72 },
    { type: 2, colorIndex: 6, width: 2.6, height: 0.95, baseIntensity: 0.68 },
    { type: 4, colorIndex: 7, width: 2.4, height: 0.85, baseIntensity: 0.85 },
    { type: 4, colorIndex: 0, width: 2.2, height: 0.8, baseIntensity: 0.82 },
    { type: 1, colorIndex: 3, width: 2.8, height: 1.0, baseIntensity: 0.88 },
  ]

  const signCount = quality.tier === 'high' ? signConfigs.length : Math.floor(signConfigs.length * 0.6)
  const activeConfigs = signConfigs.slice(0, signCount)

  const signs: {
    mat: THREE.ShaderMaterial
    seed: number
    signType: number
    baseIntensity: number
    distanceFade: number
  }[] = []

  const positions = [
    { x: -18, y: 2, z: -55 },
    { x: 12, y: 3, z: -58 },
    { x: -8, y: 1, z: -52 },
    { x: -22, y: -1, z: -45 },
    { x: 15, y: 0, z: -47 },
    { x: 0, y: -2, z: -44 },
    { x: 18, y: -3, z: -42 },
    { x: -12, y: -4, z: -38 },
    { x: 8, y: -5, z: -36 },
    { x: -3, y: -3, z: -35 },
  ]

  activeConfigs.forEach((config, i) => {
    const seed = i * 3.14159 + 0.618
    const pos = positions[i] || { x: (i - 5) * 8, y: -2 + (i % 3) * 2, z: -40 - (i % 2) * 5 }

    const distance = Math.abs(pos.z)
    const distanceFade = Math.max(0.3, 1.0 - (distance - 35) / 30) * config.baseIntensity

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        signColor: { value: neonColors[config.colorIndex] },
        introFade: { value: 0 },
        flickerSeed: { value: seed },
        signType: { value: config.type },
        dayPhase: { value: 0.5 },
        distanceFade: { value: distanceFade },
      },
      vertexShader: SHAFT_VERTEX_SHADER,
      fragmentShader: NEON_SIGN_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    let geometry: THREE.PlaneGeometry
    if (config.type === 0) {
      geometry = new THREE.PlaneGeometry(config.width, config.height, 2, 1)
    } else if (config.type === 1) {
      geometry = new THREE.PlaneGeometry(config.width, config.height, 3, 1)
    } else {
      geometry = new THREE.PlaneGeometry(config.width, config.height, 1, 1)
    }

    const mesh = new THREE.Mesh(geometry, mat)
    mesh.position.set(pos.x, pos.y, pos.z)
    mesh.rotation.y = (Math.random() - 0.5) * 0.15
    farGroup.add(mesh)
    signs.push({
      mat,
      seed,
      signType: config.type,
      baseIntensity: config.baseIntensity,
      distanceFade,
    })
  })

  const updater: Updater = (elapsed, _delta, intro, dayPhase, _humidity, _fog, _entityPace, entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    signs.forEach((s) => {
      s.mat.uniforms.time.value = elapsed
      s.mat.uniforms.introFade.value = intro
      s.mat.uniforms.dayPhase.value = dayPhase

      const unrestMod = 1.0 + (entityUnrest || 0) * 0.15
      const dynamicFade = s.distanceFade * unrestMod
      s.mat.uniforms.distanceFade.value = dynamicFade
    })
  }

  return updater
}
