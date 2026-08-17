/**
 * Lights builder for the GTA6 Codex WebGL engine.
 * Luz ambiental + luz clave (magenta neón) + luz de relleno (cian neón),
 * con el ciclo día/noche y la niebla de la escena acoplados al mismo
 * `updater`.
 *
 * Fase 8.15 — geometría (n/a, son luces), colores, intensidades,
 * posiciones, fórmulas de oscilación y el cálculo de `fogColor` vía
 * `lerpDayColor` idénticos a la versión inline anterior de
 * `setupLights()` en `engine.ts`; solo se movieron acá
 * (`buildLightsScene`). No existía ningún archivo paralelo
 * `scene/lights.ts`/`scene/light.ts` previo a esta fase (se auditó el
 * directorio `scene/`: el único archivo con "light" en el nombre era
 * `scene/light-shaft.ts`, ya conectado desde la Fase 8.10, y
 * `scene/lightShaft.ts`, un desconectado no relacionado con
 * `setupLights()` sino con el rayo de luz volumétrico) — este módulo se
 * transcribió mecánicamente desde el inline real, sin material de
 * comparación previo.
 *
 * A diferencia de la mayoría de builders migrados (Fases 8.1–8.14),
 * `setupLights()` no es solo un builder aislado: crea `keyLight` y
 * `fillLight`, dos referencias que otros builders/métodos del motor
 * consumen después (`buildDust()` les pasa `keyLight`/`fillLight` como
 * opciones de construcción; el loop de `start()` proyecta
 * `this.keyLight.position` con la cámara; `assertFullyInitialized()`
 * exige que ambos campos queden asignados de forma síncrona al salir
 * del constructor). Por eso este builder no devuelve solo un `updater`:
 * devuelve también `keyLight`/`fillLight`, para que el wrapper delgado
 * en `engine.ts` pueda seguir asignando `this.keyLight`/`this.fillLight`
 * exactamente como antes, preservando ese invariante de construcción.
 *
 * También escribe estado global del motor cada frame
 * (`this.fog.color`, vía `fog.color.setHex(...)`). Igual que
 * `scene/dust.ts` (que recibe `keyLight`/`fillLight` ya construidos como
 * opciones y lee su `.position` en vivo dentro de su propio `updater`,
 * sin volver a pasarlos por parámetro en cada frame porque su identidad
 * de objeto es estable durante toda la vida del motor), acá `fog` se
 * recibe como opción del builder y se cierra sobre esa referencia dentro
 * del `updater` — `this.fog` se crea una sola vez en el constructor
 * (antes de `setupLights()`) y nunca se reasigna, así que capturarlo por
 * closure es equivalente a leerlo de `this` en cada frame como hacía la
 * versión inline.
 *
 * El resto de valores dinámicos que la versión inline leía de `this`
 * (`dayPhase`, `entityUnrest`, `sceneMood`, `entityWarmth`,
 * `scrollProgress`) sí cambian de valor en cada frame (son escalares
 * primitivos, no referencias de objeto), así que no se pueden capturar
 * por closure — se pasan como parámetros explícitos del `updater`,
 * igual que en `scene/road.ts` (Fase 8.8) y `scene/image-billboards.ts`
 * (Fase 8.14): el `updater` de este módulo define su propia firma
 * (`LightsUpdater`) en vez de reutilizar el `Updater` genérico de 11
 * parámetros de `./sky`, porque la versión inline no seguía esa firma
 * común — leía sus seis valores dinámicos directo de `this` dentro de un
 * closure de un solo parámetro (`elapsed`).
 */

import * as THREE from 'three'
import { lerpDayColor } from '../utils/math'

/**
 * Firma propia (no `Updater` de `./sky`): este builder lee sus 6 valores
 * dinámicos directo de `this` en la versión inline original, sin seguir
 * la firma común de 11 parámetros — ver la nota de arquitectura al inicio
 * del archivo para el detalle completo de por qué diverge.
 */
export type LightsUpdater = (
  elapsed: number,
  dayPhase: number,
  entityUnrest: number,
  sceneMood: number,
  entityWarmth: number,
  scrollProgress: number
) => void

export interface LightsBuilderOptions {
  scene: THREE.Scene
  fog: THREE.FogExp2
}

export interface LightsBuildResult {
  /**
   * `keyLight`/`fillLight` se exponen para que el llamador conserve la
   * asignación de `this.keyLight`/`this.fillLight` — otros builders
   * (`buildDust()`) y el loop de `start()` dependen de esas referencias.
   */
  keyLight: THREE.PointLight
  fillLight: THREE.PointLight
  updater: LightsUpdater
}

/**
 * Construye la iluminación de la escena: luz ambiental + luz clave
 * (magenta) + luz de relleno (cian), sobre `scene`, acopladas al ciclo
 * día/noche y a la niebla (`fog`, recibida como dependencia). Genera 3
 * `THREE.Light`. Devuelve `{ keyLight, fillLight, updater }`: las luces
 * se exponen porque otros builders (`buildDust()`) y el loop las
 * consumen después; `updater: LightsUpdater` (firma propia, ver arriba)
 * anima color/intensidad/posición y actualiza `fog.color`.
 */
export function buildLightsScene(options: LightsBuilderOptions): LightsBuildResult {
  const { scene, fog } = options

  const ambient = new THREE.AmbientLight(0x3a2350, 0.5)
  scene.add(ambient)

  // Luz cálida = neón magenta (marquesina/rótulo), luz fría = neón cian.
  const keyLight = new THREE.PointLight(0xff2d78, 55, 70, 2)
  keyLight.position.set(9, 5, 12)
  scene.add(keyLight)

  const fillLight = new THREE.PointLight(0x22d3ee, 32, 70, 2)
  fillLight.position.set(-11, -3, 6)
  scene.add(fillLight)

  const updater: LightsUpdater = (elapsed, dayPhase, entityUnrest, sceneMood, entityWarmth, scrollProgress) => {
    const cycle = Math.sin(elapsed * 0.025)
    const dayWarmth = 0.5 + 0.5 * Math.cos(dayPhase * Math.PI * 2)
    keyLight.color.setHSL(
      0.92 + cycle * (0.015 + entityUnrest * 0.01) + sceneMood * 0.02 + entityWarmth * 0.03 - dayWarmth * 0.04,
      0.85,
      0.52 + dayWarmth * 0.08
    )
    fillLight.color.setHSL(0.52 + dayWarmth * 0.06, 0.75, 0.48)
    keyLight.intensity = 48 + cycle * 10 + scrollProgress * 14 + dayWarmth * 8
    fillLight.intensity = 28 + Math.cos(elapsed * 0.021) * 6 + (1 - dayWarmth) * 6
    keyLight.position.x = 9 + Math.sin(elapsed * 0.09) * 3
    keyLight.position.y = 5 + Math.cos(elapsed * 0.07) * 2

    const fogColor = lerpDayColor(dayPhase, 0x3a1830, 0x1c0f28, 0x142038)
    fog.color.setHex(fogColor)
  }

  return { keyLight, fillLight, updater }
}
