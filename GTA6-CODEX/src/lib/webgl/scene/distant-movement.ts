/**
 * Distant movement builder for the GTA6 Codex WebGL engine.
 * Siluetas de bote cruzando lentamente el horizonte de la bahía de
 * Leonida (mismo plano que `scene/water.ts`, `farGroup`), como
 * profundidad/vida ambiental de fondo sin competir con la torre focal.
 *
 * Mismo estilo silueta que `scene/far-skyline.ts` (BoxGeometry sólido,
 * sin ventanas/detalle) y mismo criterio de gating por tier que el
 * segundo haz de `scene/light-shaft.ts` (`quality.tier !== 'low'`): en
 * low-end no se construye nada.
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface DistantMovementBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

interface Boat {
  group: THREE.Group
  speed: number
  dir: number
  startX: number
}

/**
 * Construye 2-4 siluetas de bote sobre la bahía, sobre `farGroup`, según
 * `quality` (nada si `quality.tier === 'low'`). Genera un `THREE.Group`
 * por bote (casco + cabina, mismo `MeshBasicMaterial` sólido tipo
 * silueta que `far-skyline.ts`). Devuelve un único `updater: Updater`
 * que anima el cruce lateral lento del horizonte.
 */
export function buildDistantMovement(options: DistantMovementBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.tier === 'low') {
    const noop: Updater = () => {}
    return noop
  }

  const COUNT = quality.tier === 'high' ? 4 : 2

  const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x0a0612, fog: true, transparent: true, opacity: 0.85 })
  const hullGeometry = new THREE.BoxGeometry(2.4, 0.35, 0.6)
  const cabinGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.4)

  const boats: Boat[] = []

  // Misma bahía que water.ts (y=-12.8, z=-48, ancho 240): los botes
  // navegan sobre esa línea de agua, apenas por encima.
  for (let i = 0; i < COUNT; i++) {
    const goingRight = i % 2 === 0
    const group = new THREE.Group()

    const hull = new THREE.Mesh(hullGeometry, silhouetteMat)
    group.add(hull)

    const cabin = new THREE.Mesh(cabinGeometry, silhouetteMat)
    cabin.position.set(-0.5, 0.35, 0)
    group.add(cabin)

    const startX = (Math.random() - 0.5) * 110
    group.position.set(startX, -12.65, -46 - Math.random() * 6)
    farGroup.add(group)

    boats.push({ group, speed: 0.4 + Math.random() * 0.3, dir: goingRight ? 1 : -1, startX })
  }

  const HALF_RANGE = 130

  const updater: Updater = (_elapsed, delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    boats.forEach((b) => {
      b.group.position.x += b.dir * b.speed * delta * intro
      if (b.group.position.x > HALF_RANGE) b.group.position.x = -HALF_RANGE
      if (b.group.position.x < -HALF_RANGE) b.group.position.x = HALF_RANGE
    })
  }

  return updater
}
