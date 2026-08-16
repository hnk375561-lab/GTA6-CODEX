/**
 * Focal tower builder for the GTA6 Codex WebGL engine.
 * Creates the Art Deco glass tower with neon rings and beacon.
 */

import * as THREE from 'three'
import type { Updater } from './sky'

export interface TowerBuilderOptions {
  nearGroup: THREE.Group
}

export function buildFocalTower(options: TowerBuilderOptions): Updater {
  const { nearGroup } = options

  const group = new THREE.Group()
  const shaderRef = { uTime: { value: 0 } }

  const makeGlassMaterial = (tint: number) => {
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf5eaff,
      roughness: 0.05,
      metalness: 0,
      transmission: 1,
      thickness: 2.2,
      ior: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.6,
      attenuationColor: new THREE.Color(tint),
      attenuationDistance: 3,
    })
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = shaderRef.uTime
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float n = sin(position.x * 1.4 + uTime * 0.4) * cos(position.y * 0.6 + uTime * 0.3) * sin(position.z * 1.4 + uTime * 0.35);
           transformed += normal * n * 0.045;`
        )
    }
    return material
  }

  const tiers = [
    { radius: 2.5, height: 7, tint: 0xff2d78 },
    { radius: 1.7, height: 3.4, tint: 0x22d3ee },
    { radius: 1.0, height: 2.4, tint: 0xff2d78 },
  ]

  let y = -13
  const trimRings: THREE.Mesh[] = []
  tiers.forEach((tier, i) => {
    const geometry = new THREE.CylinderGeometry(tier.radius, tier.radius * 1.08, tier.height, 6)
    const material = makeGlassMaterial(tier.tint)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = y + tier.height / 2
    group.add(mesh)
    y += tier.height

    const ringColor = i % 2 === 0 ? 0x22d3ee : 0xff2d78
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(tier.radius * 1.12, 0.035, 8, 24), ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = y
    group.add(ring)
    trimRings.push(ring)
  })

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 2.6, 6),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xff2d78,
      emissiveIntensity: 0.4,
    })
  )
  spire.position.y = y + 1.3
  group.add(spire)

  const beacon = new THREE.PointLight(0xff2d78, 8, 16, 2)
  beacon.position.y = y + 2.6
  group.add(beacon)

  group.position.set(-3.2, 0.4, -1.5)
  nearGroup.add(group)

  const updater: Updater = (elapsed, delta, intro, _dayPhase, _humidity, _fog, entityPace, entityUnrest, _scrollVelocity, _pointerIntent, entityPresence) => {
    shaderRef.uTime.value = elapsed
    const paceInfluence = 1 + ((entityPace || 1) - 1) * 0.5
    group.rotation.y += delta * (0.045 + (entityPresence || 0) * 0.02) * paceInfluence * intro

    trimRings.forEach((ring, i) => {
      const mat = ring.material as THREE.MeshBasicMaterial
      const jitter = (entityUnrest || 0) * Math.sin(elapsed * (5.2 + i * 1.3)) * 0.25
      mat.opacity = 0.6 + 0.4 * Math.sin(elapsed * 0.8 + i * 1.7) + jitter
    })
    const beaconJitter = (entityUnrest || 0) * Math.sin(elapsed * 7.1) * 4
    beacon.intensity = 6 + Math.max(0, Math.sin(elapsed * 1.6)) * 10 + beaconJitter
  }

  return updater
}
