/**
 * Street traffic builder for the AutoFicha WebGL engine.
 * Vehículos con silueta real (cuerpo bajo-poly + faros/frenos) en un
 * carril propio, más cerca de cámara que el de `scene/traffic-streaks.ts`
 * (que queda intacto y sin tocar: solo luces, sin cuerpo, en un carril
 * más lejano).
 *
 * Cada vehículo es un único `THREE.Group` (cuerpo + 2 planos aditivos de
 * luz) que se mueve como una sola pieza — mismo criterio que
 * `scene/focal-tower.ts` (tiers + anillos + baliza en un solo builder
 * porque son la misma pieza física), en vez de mantener arrays paralelos
 * de cuerpos y de luces que haya que sincronizar a mano en cada frame.
 * No se importa nada de `scene/traffic-streaks.ts`: carril, rango de `z`
 * y geometría son propios de este archivo, para que uno se pueda
 * ajustar/quitar sin tocar el otro.
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface StreetTrafficBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

interface Vehicle {
  group: THREE.Group
  speed: number
  dir: number
}

/**
 * Construye el tráfico de vehículos con cuerpo (carril propio, más
 * cercano que `traffic-streaks.ts`) sobre `farGroup`, según `quality`.
 * Cada vehículo es un `THREE.Group` con un `THREE.Mesh` de cuerpo
 * (`BoxGeometry`, material sólido tipo silueta) y 2 `THREE.Mesh` de luz
 * aditiva (faro delante, freno detrás), compartiendo geometría entre
 * todos los vehículos. Devuelve un único `updater: Updater` que anima
 * posición ligada a `entityPace`/`scrollVelocity`, igual que
 * `traffic-streaks.ts`.
 */
export function buildStreetTraffic(options: StreetTrafficBuilderOptions): Updater {
  const { farGroup, quality } = options

  // Derivado internamente por tier, sin agregar campos a QualityProfile
  // (mismo criterio que light-shaft.ts/neon-signs.ts): más bajo que
  // trafficCount porque estos vehículos tienen cuerpo (más geometría/
  // draw calls por unidad) y están más cerca de cámara, donde menos
  // unidades ya leen como "calle viva".
  const COUNT = quality.tier === 'low' ? 0 : quality.tier === 'medium' ? 2 : 3

  const bodyGeometry = new THREE.BoxGeometry(1.6, 0.62, 3.4)
  const cabinGeometry = new THREE.BoxGeometry(1.3, 0.42, 1.6)
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x090909, fog: true })
  const lightGeometry = new THREE.PlaneGeometry(0.34, 0.3)

  const vehicles: Vehicle[] = []

  for (let i = 0; i < COUNT; i++) {
    const oncoming = i % 2 === 0
    const group = new THREE.Group()

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    group.add(body)

    const cabin = new THREE.Mesh(cabinGeometry, bodyMaterial)
    cabin.position.set(0, 0.5, -0.2)
    group.add(cabin)

    const lightColor = oncoming ? 0xf3f3f3 : 0x6f6f6f
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: lightColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const frontLight = new THREE.Mesh(lightGeometry, lightMaterial)
    frontLight.position.set(0, 0, oncoming ? -1.72 : 1.72)
    group.add(frontLight)

    const rearLight = new THREE.Mesh(lightGeometry, lightMaterial.clone())
    rearLight.position.set(0, 0, oncoming ? 1.72 : -1.72)
    group.add(rearLight)

    // Carril propio: x más chico (más cerca del centro/cámara) que el
    // de traffic-streaks.ts (±4.6..6.2); y = piso (-13, ver road.ts) +
    // mitad de altura del cuerpo, para que el auto se asiente sobre la
    // carretera en vez de flotar como el streak decorativo.
    const laneX = oncoming ? -2.3 - Math.random() * 0.9 : 2.3 + Math.random() * 0.9
    group.position.set(laneX, -13 + 0.31, -50 + Math.random() * 75)
    group.rotation.y = oncoming ? Math.PI : 0
    farGroup.add(group)

    vehicles.push({ group, speed: 9 + Math.random() * 6, dir: oncoming ? 1 : -1 })
  }

  // Misma lógica de velocidad/loop que traffic-streaks.ts (ligada a
  // entityPace/scrollVelocity), aplicada al Group entero.
  const updater: Updater = (_elapsed, delta, intro, _dayPhase, _humidity, _fog, entityPace, _entityUnrest, scrollVelocity, _pointerIntent, _entityPresence) => {
    vehicles.forEach((v) => {
      v.group.position.z += v.dir * v.speed * entityPace * delta * intro
      if (v.group.position.z > 25) v.group.position.z = -50
      if (v.group.position.z < -50) v.group.position.z = 25
      v.group.scale.z = 1 + Math.min(scrollVelocity * 20, 1.5)
    })
  }

  return updater
}
