/**
 * Sun/Moon builder for the GTA6 Codex WebGL engine.
 * Creates the horizon sun with bands and synthwave aesthetics.
 */

import * as THREE from 'three'
import { SUN_VERTEX_SHADER, SUN_FRAGMENT_SHADER } from '../shaders/sun'
import { lerpDayColor } from '../utils/math'
import type { Updater } from './sky'

export interface SunBuilderOptions {
  farGroup: THREE.Group
  fog: THREE.FogExp2
}

export function buildHorizonSun(options: SunBuilderOptions): Updater {
  const { farGroup, fog } = options

  const uniforms = { time: { value: 0 }, introFade: { value: 0 } }
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      coreColor: { value: new THREE.Color(0xff5b7c) },
      rimColor: { value: new THREE.Color(0xffb04d) },
    },
    vertexShader: SUN_VERTEX_SHADER,
    fragmentShader: SUN_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(46, 46, 1, 1), material)
  sun.position.set(-2, 4.5, -55)
  farGroup.add(sun)

  const updater: Updater = (elapsed, _delta, intro, dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    material.uniforms.time.value = elapsed
    material.uniforms.introFade.value = intro
    const dayLift = 0.5 + 0.5 * Math.cos(dayPhase * Math.PI * 2)
    sun.position.y = 4.5 + dayLift * 2.5
    material.uniforms.coreColor.value.setHex(lerpDayColor(dayPhase, 0xff5b7c, 0xff3d78, 0xff9060))
    material.uniforms.rimColor.value.setHex(lerpDayColor(dayPhase, 0xffb04d, 0xff6088, 0x88b0ff))
  }

  return updater
}
