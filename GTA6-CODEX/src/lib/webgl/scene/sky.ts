/**
 * Sky dome builder for the GTA6 Codex WebGL engine.
 * Creates the procedural sky dome with day/night cycle integration.
 */

import * as THREE from 'three'
import { SKY_VERTEX_SHADER, SKY_FRAGMENT_SHADER } from '../shaders/sky'
import type { QualityProfile } from '../core/quality'

export interface SkyDomeUniforms {
  time: { value: number }
  dayPhase: { value: number }
  introFade: { value: number }
  humidity: { value: number }
  fogColor: { value: THREE.Color }
}

export type Updater = (elapsed: number, delta: number, intro: number) => void

export interface SkyDomeBuilderOptions {
  humidity: number
  fog: THREE.FogExp2
  skyGroup: THREE.Group
  quality: QualityProfile
}

export function buildSkyDome(
  options: SkyDomeBuilderOptions
): { uniforms: SkyDomeUniforms; updater: Updater } {
  const { humidity, fog, skyGroup } = options

  const uniforms: SkyDomeUniforms = {
    time: { value: 0 },
    dayPhase: { value: 0.42 },
    introFade: { value: 0 },
    humidity: { value: humidity },
    fogColor: { value: fog.color.clone() },
  }

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: uniforms.time,
      dayPhase: uniforms.dayPhase,
      introFade: uniforms.introFade,
      humidity: uniforms.humidity,
      fogColor: uniforms.fogColor,
    },
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })

  const dome = new THREE.Mesh(new THREE.SphereGeometry(85, 48, 32), material)
  dome.frustumCulled = false
  skyGroup.add(dome)

  const updater: Updater = (elapsed, _delta, intro, dayPhase, currentHumidity, currentFog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    uniforms.time.value = elapsed
    uniforms.dayPhase.value = dayPhase
    uniforms.introFade.value = intro
    uniforms.humidity.value = currentHumidity
    uniforms.fogColor.value.copy(currentFog)
  }

  return { uniforms, updater }
}
