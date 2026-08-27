/**
 * Vehicle wireframes builder for the AutoFicha WebGL engine.
 * Reemplazo de la torre Art Deco de vidrio por siluetas wireframe de
 * vehículos genéricos (sedán, SUV, pickup, moto) que cruzan lentamente la
 * escena en distintas profundidades, como capas de "despiece" técnico —
 * refuerza que el catálogo es multi-categoría, sin atar la identidad
 * visual a una marca o país concreto.
 *
 * Mantiene la misma interfaz pública (`FocalTowerBuilderOptions`,
 * `buildFocalTowerScene`, nombre de archivo `scene/focal-tower.ts`) que
 * la versión anterior para no tocar el wiring de `engine.ts` (que sigue
 * llamando a `buildFocalTower()` → `buildFocalTowerScene()` sin cambios).
 */

import * as THREE from 'three'
import type { Updater } from './sky'

export interface FocalTowerBuilderOptions {
  nearGroup: THREE.Group
}

type VehicleKind = 'sedan' | 'suv' | 'pickup' | 'moto'

interface VehicleSpec {
  kind: VehicleKind
  scale: number
  laneY: number
  laneZ: number
  speed: number
  startX: number
  color: number
}

/**
 * Construye una silueta wireframe paramétrica y genérica para `kind`
 * (cajas + ruedas, sin curvas de marca), usando `EdgesGeometry` para que
 * solo se dibujen las aristas — look de plano técnico, no de modelo
 * renderizado.
 */
function buildVehicleWireframe(kind: VehicleKind, color: number): THREE.Group {
  const group = new THREE.Group()
  const edgeMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  })

  const addEdges = (geometry: THREE.BufferGeometry, position: [number, number, number]) => {
    const edges = new THREE.EdgesGeometry(geometry)
    const mesh = new THREE.LineSegments(edges, edgeMat)
    mesh.position.set(...position)
    group.add(mesh)
    return mesh
  }

  const addWheel = (x: number, z: number) => {
    const wheel = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 10)
    wheel.rotateZ(Math.PI / 2)
    addEdges(wheel, [x, -0.55, z])
  }

  if (kind === 'sedan') {
    addEdges(new THREE.BoxGeometry(4.2, 0.7, 1.7), [0, -0.15, 0])
    addEdges(new THREE.BoxGeometry(2.0, 0.65, 1.5), [-0.2, 0.55, 0])
    addWheel(-1.4, 0.85)
    addWheel(-1.4, -0.85)
    addWheel(1.4, 0.85)
    addWheel(1.4, -0.85)
  } else if (kind === 'suv') {
    addEdges(new THREE.BoxGeometry(4.4, 1.0, 1.85), [0, 0.05, 0])
    addEdges(new THREE.BoxGeometry(2.6, 0.8, 1.65), [-0.1, 0.85, 0])
    addWheel(-1.5, 0.92)
    addWheel(-1.5, -0.92)
    addWheel(1.5, 0.92)
    addWheel(1.5, -0.92)
  } else if (kind === 'pickup') {
    addEdges(new THREE.BoxGeometry(2.3, 0.75, 1.8), [-0.9, 0.0, 0])
    addEdges(new THREE.BoxGeometry(1.9, 0.6, 1.75), [-1.5, 0.7, 0])
    addEdges(new THREE.BoxGeometry(2.0, 0.55, 1.75), [1.2, -0.05, 0])
    addWheel(-1.7, 0.95)
    addWheel(-1.7, -0.95)
    addWheel(1.5, 0.95)
    addWheel(1.5, -0.95)
  } else {
    // moto
    addEdges(new THREE.BoxGeometry(1.8, 0.35, 0.4), [0, -0.2, 0])
    addEdges(new THREE.CylinderGeometry(0.02, 0.25, 0.9, 8), [0.55, 0.35, 0])
    addWheel(-0.85, 0)
    addWheel(0.85, 0)
  }

  return group
}

/**
 * Construye las siluetas wireframe de vehículos que cruzan `nearGroup`
 * en distintos carriles de profundidad. Devuelve un único
 * `updater: Updater` que anima el desplazamiento en X (con wrap-around),
 * el fade de intro y una leve variación de opacidad por "unrest" —
 * mismo rol que el jitter/parpadeo de la torre anterior, aplicado a un
 * elemento distinto.
 */
export function buildFocalTowerScene(options: FocalTowerBuilderOptions): Updater {
  const { nearGroup } = options

  // Paleta "Blueprint Drift": grafito/blanco con un acento ámbar sutil
  // para diferenciar carriles, en vez del rosa/cian saturado anterior.
  const specs: VehicleSpec[] = [
    { kind: 'sedan', scale: 1.0, laneY: 0.4, laneZ: -1.5, speed: 0.05, startX: -6, color: 0xd8dfe6 },
    { kind: 'suv', scale: 1.05, laneY: 1.9, laneZ: -4.5, speed: 0.035, startX: 8, color: 0xc8b98a },
    { kind: 'pickup', scale: 1.0, laneY: -1.1, laneZ: 1.2, speed: 0.06, startX: -10, color: 0xd8dfe6 },
    { kind: 'moto', scale: 1.4, laneY: -2.6, laneZ: 3.0, speed: 0.08, startX: 5, color: 0xc8b98a },
  ]

  const bounds = 16

  const vehicles: {
    group: THREE.Group
    mat: THREE.LineBasicMaterial
    speed: number
    baseOpacity: number
  }[] = []

  specs.forEach((spec) => {
    const veh = buildVehicleWireframe(spec.kind, spec.color)
    veh.scale.setScalar(spec.scale)
    veh.position.set(spec.startX, spec.laneY, spec.laneZ)
    veh.rotation.y = Math.PI / 2
    nearGroup.add(veh)

    // Se cachea el material compartido de la silueta (todas las
    // LineSegments del grupo usan la misma instancia de material) para
    // no tener que recorrer `veh.children` en cada frame del updater.
    const mat = (veh.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial

    vehicles.push({ group: veh, mat, speed: spec.speed, baseOpacity: 0.85 })
  })

  const updater: Updater = (
    _elapsed,
    delta,
    intro,
    _dayPhase,
    _humidity,
    _fog,
    entityPace,
    entityUnrest,
    _scrollVelocity,
    _pointerIntent,
    entityPresence
  ) => {
    const paceInfluence = 1 + (entityPace - 1) * 0.5
    vehicles.forEach((v) => {
      v.group.position.x += delta * v.speed * paceInfluence * (0.6 + entityPresence * 0.4) * intro
      if (v.group.position.x > bounds) v.group.position.x = -bounds

      // Leve variación de opacidad por "unrest" — un dato inestable
      // titila un poco, uno confirmado queda estable — determinista.
      v.mat.opacity = v.baseOpacity * intro * (1 - entityUnrest * 0.15)
    })
  }

  return updater
}
