/**
 * Street signals builder for the AutoFicha WebGL engine.
 * Postes delgados con semáforo (3 discos apilados) cerca del borde de la
 * carretera — textura urbana en primer/medio plano.
 *
 * Paleta: cian/magenta (la ya establecida en toda la escena, ver
 * `focal-tower.ts`/`light-shaft.ts`/`neon-signs.ts` — colores de anillo
 * 0x22d3ee/0xff2d78), no rojo/ámbar/verde literal. Se evita el rojo
 * literal en particular porque `street-traffic.ts` ya usa rojo
 * (0xff2d4d) para las luces de freno de los vehículos; un semáforo rojo
 * al lado competiría semánticamente con esa lectura.
 *
 * Ciclo de color determinista por `elapsed` (no aleatorio) — mismo
 * criterio que el flicker de `neon-signs.ts`/`far-skyline.ts`: nada de
 * `Math.random()` dentro del updater, solo funciones de `elapsed` y una
 * fase fija calculada una vez por poste.
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface StreetSignalsBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

const CYCLE_PERIOD = 6 // segundos por ciclo completo de 3 colores
const COLORS = [0x22d3ee, 0xff2d78, 0x22d3ee] // cian → magenta → cian

interface Signal {
  discMaterials: THREE.MeshBasicMaterial[]
  phaseOffset: number
}

/**
 * Construye postes con semáforo (3 discos apilados, ciclo cian/magenta
 * determinista) cerca del borde de la carretera, sobre `farGroup`, según
 * `quality` (nada si `quality.tier === 'low'`, mismo criterio que
 * `light-shaft.ts`). Devuelve un único `updater: Updater` que anima el
 * ciclo de color de cada semáforo.
 */
export function buildStreetSignals(options: StreetSignalsBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.tier === 'low') {
    const noop: Updater = () => {}
    return noop
  }

  const COUNT = quality.tier === 'high' ? 3 : 2

  const poleMat = new THREE.MeshBasicMaterial({ color: 0x0a0612, fog: true })
  const poleGeometry = new THREE.CylinderGeometry(0.045, 0.06, 3.2, 6)
  const boxGeometry = new THREE.BoxGeometry(0.22, 0.6, 0.16)
  const discGeometry = new THREE.CircleGeometry(0.07, 12)

  const signals: Signal[] = []

  for (let i = 0; i < COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const group = new THREE.Group()

    const pole = new THREE.Mesh(poleGeometry, poleMat)
    pole.position.y = -13 + 1.6
    group.add(pole)

    const box = new THREE.Mesh(boxGeometry, poleMat)
    box.position.set(0, -13 + 3.05, 0.11)
    group.add(box)

    const discMaterials: THREE.MeshBasicMaterial[] = []
    for (let d = 0; d < 3; d++) {
      const mat = new THREE.MeshBasicMaterial({
        color: COLORS[0],
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const disc = new THREE.Mesh(discGeometry, mat)
      disc.position.set(0, -13 + 3.28 - d * 0.19, 0.2)
      group.add(disc)
      discMaterials.push(mat)
    }

    const laneX = side * (5.4 + Math.random() * 0.6)
    const z = -18 - Math.random() * 14
    group.position.set(laneX, 0, z)
    farGroup.add(group)

    signals.push({ discMaterials, phaseOffset: i * 2.1 })
  }

  const updater: Updater = (elapsed, _delta, _intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    signals.forEach((s) => {
      // Determinista: función pura de elapsed + fase fija del poste, sin
      // aleatoriedad por frame.
      const t = ((elapsed + s.phaseOffset) % CYCLE_PERIOD) / CYCLE_PERIOD
      const activeIndex = Math.floor(t * 3) % 3
      s.discMaterials.forEach((mat, idx) => {
        const isActive = idx === activeIndex
        mat.color.set(COLORS[activeIndex])
        mat.opacity = isActive ? 0.9 : 0.15
      })
    })
  }

  return updater
}
