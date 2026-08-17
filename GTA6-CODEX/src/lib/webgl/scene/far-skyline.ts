/**
 * Far skyline builder for the GTA6 Codex WebGL engine.
 * Skyline de Miami: edificios con ventanas encendidas alternados con
 * palmeras en silueta, en el plano lejano (`farGroup`).
 *
 * Fase 8.11 — geometría, material, colores, escalas, posiciones,
 * rotaciones y valores numéricos idénticos a la versión inline anterior
 * de `buildFarSkyline()` en `engine.ts`; solo se movieron acá. El
 * `updater` principal y los `windowUpdaters` (uno por ventana, para el
 * parpadeo) usan la firma común de 11 parámetros de `scene/*.ts` (ver
 * `Updater` en `./sky` y la nota de arquitectura al pie de
 * `engine.ts`), en vez de leer `this.quality`/`this.dayPhase`
 * directamente como hacía la versión inline — por eso reciben `quality`
 * y `dayPhase` como parámetros del closure. El wrapper en `engine.ts`
 * (`buildFarSkyline()`) se encarga de invocarlos con el estado del
 * motor en cada frame, igual que en las Fases 8.1/8.2/8.7/8.8/8.9/8.10.
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface FarSkylineBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

/**
 * Construye el skyline lejano (edificios con ventanas + palmeras en
 * silueta) sobre `farGroup`, según `quality`. Genera los `THREE.Mesh` de
 * edificios/ventanas/palmeras. Devuelve `{ updater, windowUpdaters }`: el
 * `updater` principal anima las siluetas; `windowUpdaters` es un
 * `Updater` por ventana para su parpadeo individual.
 */
export function buildFarSkyline(
  options: FarSkylineBuilderOptions
): { updater: Updater; windowUpdaters: Updater[] } {
  const { farGroup, quality } = options

  const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x0a0612, fog: true, transparent: true, opacity: 0.92 })
  const windowColors = [0xffd166, 0x22d3ee, 0xff3d81]
  const shapes: THREE.Object3D[] = []
  const windowUpdaters: Updater[] = []

  for (let i = 0; i < 9; i++) {
    const isPalm = i % 3 === 2
    const xPos = (Math.random() - 0.5) * 78
    const zPos = -32 - Math.random() * 20

    if (isPalm) {
      const palm = new THREE.Group()
      const trunkHeight = 5 + Math.random() * 3
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, trunkHeight, 6), silhouetteMat)
      trunk.position.y = -13 + trunkHeight / 2
      trunk.rotation.z = (Math.random() - 0.5) * 0.18
      palm.add(trunk)

      const frondCount = 6
      for (let f = 0; f < frondCount; f++) {
        const angle = (f / frondCount) * Math.PI * 2
        const frond = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.32), silhouetteMat)
        frond.position.set(Math.cos(angle) * 1.1, -13 + trunkHeight + 0.15, Math.sin(angle) * 0.44)
        frond.rotation.y = angle
        frond.rotation.z = 0.5
        palm.add(frond)
      }
      palm.position.set(xPos, 0, zPos + 8)
      farGroup.add(palm)
      shapes.push(palm)
    } else {
      const width = 0.9 + Math.random() * 1.3
      const height = 6 + Math.random() * 12
      const depth = 0.9 + Math.random() * 1.3
      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), silhouetteMat)
      building.position.set(xPos, -13 + height / 2, zPos)
      farGroup.add(building)
      shapes.push(building)

      const windowCount = 2 + Math.floor(Math.random() * 3)
      for (let w = 0; w < windowCount; w++) {
        const winColor = windowColors[Math.floor(Math.random() * windowColors.length)]
        const winMat = new THREE.MeshBasicMaterial({
          color: winColor,
          transparent: true,
          opacity: 0.55 + Math.random() * 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
        const win = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.7, height * 0.12), winMat)
        win.position.set(
          xPos + (Math.random() - 0.5) * width * 0.3,
          -13 + Math.random() * height * 0.8 + height * 0.1,
          zPos + depth / 2 + 0.02
        )
        farGroup.add(win)
        shapes.push(win)

        const wi = w
        const winMatLocal = winMat

        // Ventana individual: parpadeo (idéntico a la versión inline).
        windowUpdaters.push((elapsed, _delta, _intro, dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
          if (quality.tier === 'low') return
          const flicker = 0.45 + 0.55 * Math.sin(elapsed * (0.8 + wi * 0.3) + i * 1.7)
          winMatLocal.opacity = (0.35 + flicker * 0.5) * (0.7 + dayPhase * 0.3)
        })
      }
    }
  }

  const updater: Updater = (elapsed, _delta, _intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    shapes.forEach((s, i) => {
      s.position.y += Math.sin(elapsed * 0.02 + i) * 0.0012
    })
  }

  return { updater, windowUpdaters }
}
