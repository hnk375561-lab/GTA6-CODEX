/**
 * Traffic streaks builder for the AutoFicha WebGL engine.
 * Tráfico: faros blancos que se acercan y luces de freno rojas que se
 * alejan, en loop sobre la carretera.
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface TrafficStreaksBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

/**
 * Construye el tráfico de la carretera (faros blancos + luces de freno
 * rojas en loop), sobre `farGroup`, según `quality`. Genera
 * `quality.trafficCount` `THREE.Mesh` con `MeshBasicMaterial` aditivo.
 * Devuelve un único `updater: Updater` que anima posición y velocidad
 * ligada a `entityPace`/`scrollVelocity`.
 */
export function buildTrafficStreaks(options: TrafficStreaksBuilderOptions): Updater {
  const { farGroup, quality } = options

  const COUNT = quality.trafficCount
  const streaks: { mesh: THREE.Mesh; speed: number; dir: number }[] = []
  const streakGeometry = new THREE.PlaneGeometry(0.32, 3.2)

  for (let i = 0; i < COUNT; i++) {
    const oncoming = i % 2 === 0
    const color = oncoming ? 0xfff2d6 : 0xff2d4d
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(streakGeometry, material)
    const laneX = oncoming ? -4.6 - Math.random() * 1.6 : 4.6 + Math.random() * 1.6
    mesh.position.set(laneX, -12.55, -60 + Math.random() * 90)
    mesh.rotation.x = -Math.PI / 2
    farGroup.add(mesh)
    streaks.push({ mesh, speed: 14 + Math.random() * 10, dir: oncoming ? 1 : -1 })
  }

  // Velocidad real del tráfico ligada al "pace" de la categoría: en una
  // ficha de vehículo la carretera se siente notablemente más rápida;
  // en una ubicación, se asienta.
  const updater: Updater = (_elapsed, delta, intro, _dayPhase, _humidity, _fog, entityPace, _entityUnrest, scrollVelocity, _pointerIntent, _entityPresence) => {
    streaks.forEach((s) => {
      s.mesh.position.z += s.dir * s.speed * entityPace * delta * intro
      if (s.mesh.position.z > 30) s.mesh.position.z = -60
      if (s.mesh.position.z < -60) s.mesh.position.z = 30
      s.mesh.scale.y = 1 + Math.min(scrollVelocity * 40, 3)
    })
  }

  return updater
}
