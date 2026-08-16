/**
 * Road builder for the GTA6 Codex WebGL engine.
 * Creates the wet road with asphalt, lane markings, and heat shimmer.
 */

import * as THREE from 'three'
import { ROAD_VERTEX_SHADER, ROAD_FRAGMENT_SHADER } from '../shaders/road'
import { ROAD_FLOW_WRAP } from '../config/scene'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface RoadBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
  humidity: number
  reducedMotion: boolean
}

export function buildRoad(options: RoadBuilderOptions): Updater {
  const { farGroup, quality, humidity, reducedMotion } = options

  const geometry = new THREE.PlaneGeometry(220, 220, 1, 1)
  const uniforms = { time: { value: 0 }, introFade: { value: 0 } }
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      flow: { value: 0 },
      colorA: { value: new THREE.Color(0x22d3ee) },
      colorB: { value: new THREE.Color(0xff2d78) },
      humidity: { value: 0.45 },
      heatShimmer: { value: 0.0 },
    },
    vertexShader: ROAD_VERTEX_SHADER,
    fragmentShader: ROAD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const floor = new THREE.Mesh(geometry, material)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -13
  farGroup.add(floor)

  let roadFlow = 0

  const updater: Updater = (elapsed, delta, intro, _dayPhase, currentHumidity, _fog, entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    material.uniforms.time.value = elapsed
    material.uniforms.introFade.value = intro
    material.uniforms.flow.value = roadFlow
    material.uniforms.humidity.value = currentHumidity
    material.uniforms.heatShimmer.value = reducedMotion ? 0 : 0.35 + (entityPace || 1) * 0.15

    roadFlow = (roadFlow + delta * 5 * (entityPace || 1)) % ROAD_FLOW_WRAP
  }

  return updater
}
