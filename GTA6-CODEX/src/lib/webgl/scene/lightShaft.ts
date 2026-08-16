/**
 * Light shaft builder for the GTA6 Codex WebGL engine.
 * Creates neon light shafts rising from the focal tower.
 */

import * as THREE from 'three'
import { SHAFT_VERTEX_SHADER, SHAFT_FRAGMENT_SHADER } from '../shaders/neon'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface LightShaftBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

export function buildLightShaft(options: LightShaftBuilderOptions): Updater {
  const { farGroup, quality } = options

  const uniforms = { time: { value: 0 }, introFade: { value: 0 } }
  const geometry = new THREE.PlaneGeometry(14, 46, 1, 1)
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, shaftColor: { value: new THREE.Color(0xff5fa8) } },
    vertexShader: SHAFT_VERTEX_SHADER,
    fragmentShader: SHAFT_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })

  const shaft = new THREE.Mesh(geometry, material)
  shaft.position.set(-3.2, 8, -5)
  shaft.rotation.z = 0.05
  shaft.rotation.x = -0.06
  farGroup.add(shaft)

  if (quality.tier !== 'low') {
    const shaft2 = new THREE.Mesh(
      geometry.clone(),
      new THREE.ShaderMaterial({
        uniforms: { ...uniforms, shaftColor: { value: new THREE.Color(0x22d3ee) } },
        vertexShader: SHAFT_VERTEX_SHADER,
        fragmentShader: SHAFT_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    )
    shaft2.position.set(5.5, 6, -8)
    shaft2.rotation.z = -0.08
    shaft2.rotation.x = -0.04
    shaft2.scale.set(0.7, 0.85, 1)
    farGroup.add(shaft2)
  }

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    material.uniforms.time.value = elapsed
    material.uniforms.introFade.value = intro
  }

  return updater
}
