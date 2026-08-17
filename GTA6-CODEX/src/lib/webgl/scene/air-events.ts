/**
 * Air events builder for the GTA6 Codex WebGL engine.
 * Avión comercial lejano cruzando el cielo, muy por encima del skyline
 * (`scene/far-skyline.ts`, tope ~y=5) y de los haces de neón
 * (`scene/light-shaft.ts`, y=6..8), para no cruzarse con ellos.
 *
 * Fase 10.4A — solo cielo. Silueta sólida (cuerpo + alas), sin luces ni
 * material aditivo (a propósito: "No agregar luces ni bloom en primera
 * versión"). Movimiento lateral lineal, puramente determinista por
 * `elapsed` — sin `Math.random()` en el updater y sin allocations por
 * frame (se escribe directo sobre `group.position.x`, sin crear
 * vectores/objetos temporales).
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface AirEventsBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

// Recorrido lateral completo (de punta a punta) y período del ciclo, en
// segundos. Un solo avión, movimiento lineal, sin aceleración.
const HALF_RANGE = 95
const CROSS_PERIOD = 70

/**
 * Construye un avión lejano (silueta cuerpo + alas, `BoxGeometry`) sobre
 * `farGroup`, según `quality` (nada si `quality.tier === 'low'`; una
 * única unidad en `medium`/`high` — no hay reducción posible por debajo
 * de 1, así que ambos tiers muestran la misma unidad). Devuelve un único
 * `updater: Updater` que anima el barrido lateral lineal.
 */
export function buildAirEvents(options: AirEventsBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.tier === 'low') {
    const noop: Updater = () => {}
    return noop
  }

  const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x0a0612, fog: true, transparent: true, opacity: 0.9 })

  const group = new THREE.Group()

  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 3.4), silhouetteMat)
  group.add(fuselage)

  const wing = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.5), silhouetteMat)
  wing.position.z = -0.1
  group.add(wing)

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.3), silhouetteMat)
  tailWing.position.z = 1.55
  group.add(tailWing)

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.35), silhouetteMat)
  tailFin.position.set(0, 0.25, 1.55)
  group.add(tailFin)

  group.position.set(-HALF_RANGE, 15, -70)
  group.rotation.y = Math.PI / 2
  farGroup.add(group)

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    // Determinista: rampa lineal de -HALF_RANGE a +HALF_RANGE sobre un
    // período fijo, sin estado acumulado ni Math.random(). `intro`
    // multiplica al final para que el avión no aparezca ya en
    // movimiento durante el fade de entrada (mismo criterio que el
    // resto de updaters: `* intro`).
    const t = (elapsed % CROSS_PERIOD) / CROSS_PERIOD
    const target = -HALF_RANGE + t * HALF_RANGE * 2
    group.position.x = -HALF_RANGE + (target - -HALF_RANGE) * intro
  }

  return updater
}
