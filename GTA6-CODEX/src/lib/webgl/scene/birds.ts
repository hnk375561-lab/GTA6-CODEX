/**
 * Birds builder for the GTA6 Codex WebGL engine.
 * Bandadas pequeñas de aves lejanas en el plano medio-alto de `farGroup`,
 * por debajo del avión de `scene/air-events.ts` (y=15) y mezcladas con la
 * franja superior del skyline/haces de neón.
 *
 * Fase 10.4A — geometría y material compartidos entre todas las aves de
 * todas las bandadas (una sola `BufferGeometry`, un solo
 * `MeshBasicMaterial`, un `THREE.Mesh` por ave que la reutiliza). Cada
 * ave guarda sus offsets de fase FIJOS (calculados una sola vez al
 * construir, no por frame). El updater recorre un array ya existente de
 * referencias — no crea arrays/vectores temporales ni usa
 * `Math.random()`; toda la trayectoria es una función cerrada de
 * `elapsed` + los offsets fijos de cada ave.
 *
 * Fase 10.4A FIX — única corrección: la bandada `(18, 11, -62)` daba una
 * profundidad de cámara de ~96-101 según la toma activa (`camera.far =
 * 100`, cámara en `z≈34-39` entre las 4 `SHOTS`), al borde del far
 * plane, con riesgo de parpadeo en transiciones. Se cambia solo su
 * `baseZ` a -52 (misma profundidad segura que ya usa `far-skyline.ts`,
 * ~91 de margen) — sin tocar cantidad, sistema de movimiento ni
 * geometría/material compartidos.
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface BirdsBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

interface Bird {
  mesh: THREE.Mesh
  // Offsets fijos, calculados una sola vez al construir.
  phase: number
  baseX: number
  baseY: number
  baseZ: number
  ampX: number
  ampY: number
  speed: number
}

// Bandadas fijas (posición base + tamaño), sin aleatoriedad: cada
// bandada es una entrada literal de esta tabla, igual que
// `IMAGE_BILLBOARDS`/`SHOTS` en `config/scene.ts` (constantes locales,
// determinismo por diseño en vez de por sorteo).
interface FlockDef {
  baseX: number
  baseY: number
  baseZ: number
  count: number
  phaseOffset: number
}

const FLOCKS_HIGH: FlockDef[] = [
  { baseX: -30, baseY: 9.5, baseZ: -55, count: 5, phaseOffset: 0 },
  { baseX: 18, baseY: 11, baseZ: -52, count: 4, phaseOffset: 2.4 },
  { baseX: -8, baseY: 8, baseZ: -48, count: 3, phaseOffset: 4.8 },
]

const FLOCKS_MEDIUM: FlockDef[] = [
  { baseX: -30, baseY: 9.5, baseZ: -55, count: 3, phaseOffset: 0 },
  { baseX: 18, baseY: 11, baseZ: -52, count: 3, phaseOffset: 2.4 },
]

/**
 * Construye bandadas de aves (geometría/material compartidos) sobre
 * `farGroup`, según `quality` (nada si `quality.tier === 'low'`;
 * `FLOCKS_MEDIUM` en `medium`, `FLOCKS_HIGH` en `high`). Devuelve un
 * único `updater: Updater` que anima el vuelo suave de cada ave.
 */
export function buildBirds(options: BirdsBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.tier === 'low') {
    const noop: Updater = () => {}
    return noop
  }

  const flockDefs = quality.tier === 'high' ? FLOCKS_HIGH : FLOCKS_MEDIUM

  // Geometría/material compartidos: una silueta mínima en V (dos
  // segmentos), un solo par geometría+material para todas las aves de
  // todas las bandadas.
  const birdGeometry = new THREE.BufferGeometry()
  // prettier-ignore
  const vertices = new Float32Array([
    -0.18, 0, 0,   0, 0.05, 0,   0.18, 0, 0,
  ])
  birdGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  birdGeometry.setIndex([0, 1, 2])

  const birdMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a0612,
    fog: true,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  })

  const birds: Bird[] = []

  flockDefs.forEach((flock) => {
    for (let i = 0; i < flock.count; i++) {
      const mesh = new THREE.Mesh(birdGeometry, birdMaterial)
      // Offsets fijos por ave dentro de la bandada: separación
      // determinista (no random), derivada solo de índices.
      const offsetX = (i - (flock.count - 1) / 2) * 0.9
      const offsetZ = (i % 2 === 0 ? 1 : -1) * 0.4
      mesh.position.set(flock.baseX + offsetX, flock.baseY, flock.baseZ + offsetZ)
      farGroup.add(mesh)

      birds.push({
        mesh,
        phase: flock.phaseOffset + i * 0.35,
        baseX: flock.baseX + offsetX,
        baseY: flock.baseY,
        baseZ: flock.baseZ + offsetZ,
        ampX: 6 + (i % 3) * 1.5,
        ampY: 0.5 + (i % 2) * 0.25,
        speed: 0.05 + (i % 3) * 0.01,
      })
    }
  })

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    // Sin arrays temporales: se escribe directo sobre cada mesh ya
    // existente en `birds`, función cerrada de `elapsed` + los offsets
    // fijos calculados arriba en la construcción.
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i]
      const t = elapsed * b.speed + b.phase
      b.mesh.position.x = b.baseX + Math.sin(t) * b.ampX * intro
      b.mesh.position.y = b.baseY + Math.sin(t * 1.7) * b.ampY * intro
    }
  }

  return updater
}
