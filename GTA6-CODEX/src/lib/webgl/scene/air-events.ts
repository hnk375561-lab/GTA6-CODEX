/**
 * Air events builder for the AutoFicha WebGL engine.
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
 *
 * Fase 10.4A FIX — 3 correcciones sobre la auditoría:
 *
 * 1) Profundidad: `z` pasa de -70 a -55. `camera.far = 100` y la cámara
 *    ronda `z≈34-39` entre las 4 `SHOTS` (ver `config/scene.ts`); a
 *    z=-70 la profundidad resultante (~104-109) superaba el far plane
 *    en las 4 tomas, dejando el avión invisible. z=-55 da una
 *    profundidad de ~89-94 en la peor toma, dentro del mismo rango ya
 *    usado y verificado por `far-skyline.ts` (hasta z=-52) y
 *    `traffic-streaks.ts` (hasta z=-60) — misma "sensación de
 *    distancia" que esos elementos, sin cambiar el resto de la puesta
 *    en escena (`HALF_RANGE`, `y=15` sin tocar).
 *
 * 2) Orientación: se elimina `group.rotation.y = Math.PI / 2`. Esa
 *    rotación alineaba el fuselaje con el eje de desplazamiento (X),
 *    pero de paso rotaba el eje largo del ala (originalmente en X
 *    local) hacia Z del mundo — el eje de profundidad de la cámara,
 *    donde queda escorzada a casi nada en pantalla. Ahora el fuselaje
 *    se construye directamente largo en X local (sin rotación de
 *    grupo), y el ala/cola quedan con su extensión principal en Y
 *    (vertical, siempre legible en pantalla sin importar el ángulo
 *    exacto de cámara) en vez de en Z — mismos 4 meshes, mismas
 *    primitivas `BoxGeometry`, solo cambian dimensiones/posiciones
 *    (sin geometría ni complejidad nueva).
 *
 * 3) `quality.tier === 'medium'`: antes era idéntico a `high`. Ahora
 *    difiere en dos valores baratos, fijados una sola vez en la
 *    construcción (cero costo por frame): opacidad más baja (menor
 *    presencia visual) y `CROSS_PERIOD` más largo (menor frecuencia de
 *    aparición — el mismo avión cruza con menos frecuencia).
 */

import * as THREE from 'three'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface AirEventsBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

// Recorrido lateral completo (de punta a punta), en unidades de mundo.
// Un solo avión, movimiento lineal, sin aceleración.
const HALF_RANGE = 95

/**
 * Construye un avión lejano (silueta cuerpo + alas, `BoxGeometry`) sobre
 * `farGroup`, según `quality` (nada si `quality.tier === 'low'`; una
 * única unidad en `medium`/`high`, diferenciada por opacidad y
 * frecuencia de cruce — ver nota de cabecera, punto 3). Devuelve un
 * único `updater: Updater` que anima el barrido lateral lineal.
 */
export function buildAirEvents(options: AirEventsBuilderOptions): Updater {
  const { farGroup, quality } = options

  if (quality.tier === 'low') {
    const noop: Updater = () => {}
    return noop
  }

  // Diferenciación medium/high: barata, fijada una sola vez acá (no por
  // frame). Menor opacidad + cruces más espaciados en medium ("menor
  // presencia visual" + "menor frecuencia de aparición").
  const opacity = quality.tier === 'medium' ? 0.55 : 0.9
  const crossPeriod = quality.tier === 'medium' ? 100 : 70

  const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x090909, fog: true, transparent: true, opacity })

  const group = new THREE.Group()

  // Fuselaje: largo directamente en X local (dirección de desplazamiento
  // del grupo), sin rotación de grupo necesaria.
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.22), silhouetteMat)
  group.add(fuselage)

  // Ala principal: extensión mayor en Y (vertical), visible en pantalla
  // sin importar el ángulo horizontal exacto de cámara — en vez de Z
  // (profundidad), que quedaba escorzada. Componente menor en Z para no
  // leer como una cruz plana.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.5), silhouetteMat)
  group.add(wing)

  // Estabilizador de cola: mismo criterio (extensión en Y), ubicado en
  // el extremo trasero del fuselaje (ahora en X, no en Z).
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.3), silhouetteMat)
  tailWing.position.x = 1.55
  group.add(tailWing)

  // Deriva vertical: ya estaba orientada en Y, solo se reubica en X
  // (extremo trasero) en vez de Z.
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.35), silhouetteMat)
  tailFin.position.set(1.55, 0.25, 0)
  group.add(tailFin)

  group.position.set(-HALF_RANGE, 15, -55)
  farGroup.add(group)

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    // Determinista: rampa lineal de -HALF_RANGE a +HALF_RANGE sobre un
    // período fijo, sin estado acumulado ni Math.random(). `intro`
    // multiplica al final para que el avión no aparezca ya en
    // movimiento durante el fade de entrada (mismo criterio que el
    // resto de updaters: `* intro`).
    const t = (elapsed % crossPeriod) / crossPeriod
    const target = -HALF_RANGE + t * HALF_RANGE * 2
    group.position.x = -HALF_RANGE + (target - -HALF_RANGE) * intro
  }

  return updater
}
