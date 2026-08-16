/**
 * Water horizon builder for the GTA6 Codex WebGL engine.
 * Creates the Leonida bay with reflective water and waves.
 */

import * as THREE from 'three'
import { WATER_VERTEX_SHADER, WATER_FRAGMENT_SHADER } from '../shaders/water'
import type { Updater } from './sky'

export interface WaterBuilderOptions {
  farGroup: THREE.Group
}

export function buildWaterHorizon(options: WaterBuilderOptions): Updater {
  const { farGroup } = options

  const uniforms = { time: { value: 0 }, introFade: { value: 0 }, dayPhase: { value: 0.42 } }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WATER_VERTEX_SHADER,
    fragmentShader: WATER_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  })
  const water = new THREE.Mesh(new THREE.PlaneGeometry(240, 120, 1, 1), material)
  water.rotation.x = -Math.PI / 2
  water.position.y = -12.8
  water.position.z = -48
  farGroup.add(water)

  const updater: Updater = (elapsed, _delta, intro, dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    material.uniforms.time.value = elapsed
    material.uniforms.introFade.value = intro
    material.uniforms.dayPhase.value = dayPhase
  }

  return updater
}
