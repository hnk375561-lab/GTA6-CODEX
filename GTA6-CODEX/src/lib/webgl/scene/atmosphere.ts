/**
 * Atmospheric haze builder for the GTA6 Codex WebGL engine.
 * Creates volumetric haze layers with parallax and FBM noise.
 */

import * as THREE from 'three'
import { HAZE_VERTEX_SHADER, HAZE_FRAGMENT_SHADER } from '../shaders/particles'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface AtmosphereBuilderOptions {
  midGroup: THREE.Group
  quality: QualityProfile
}

export function buildAtmosphericHaze(options: AtmosphereBuilderOptions): Updater {
  const { midGroup, quality } = options

  const layers: THREE.Mesh[] = []
  for (let i = 0; i < quality.hazeLayers; i++) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        introFade: { value: 0 },
        hazeColor: { value: new THREE.Color(i % 2 === 0 ? 0x6a2878 : 0x284868) },
        layerSeed: { value: i * 1.73 },
      },
      vertexShader: HAZE_VERTEX_SHADER,
      fragmentShader: HAZE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(90 + i * 20, 35, 1, 1), mat)
    mesh.position.set(0, -2 + i * 2.5, -18 - i * 12)
    midGroup.add(mesh)
    layers.push(mesh)
  }

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, scrollVelocity, _pointerIntent, _entityPresence) => {
    layers.forEach((l, i) => {
      const mat = l.material as THREE.ShaderMaterial
      mat.uniforms.time.value = elapsed
      mat.uniforms.introFade.value = intro
      l.position.x = Math.sin(elapsed * 0.03 + i) * (1.2 + i * 0.4)
      l.position.y = -2 + i * 2.5 + (scrollVelocity || 0) * (0.8 + i * 0.3) * intro
    })
  }

  return updater
}
