/**
 * Horizon sun builder for the GTA6 Zona WebGL engine.
 * Sol/luna bajo de horizonte con bandas cortadas — el atardecer de Miami
 * detrás del skyline.
 *
 * Fase 8.9 — geometría, material, uniforms y valores idénticos a la
 * versión inline anterior de `engine.ts`; solo se movieron acá
 * (`buildHorizonSun`). Igual que en `scene/sky.ts`/`scene/water.ts`, el
 * `updater` usa la firma común de 11 parámetros de `scene/*.ts` (ver
 * nota de arquitectura al pie de `engine.ts`) en vez de cerrar sobre
 * `this` — el único valor dinámico que la versión inline leía de
 * `engine.ts` era `this.dayPhase`, que ya forma parte de esa firma
 * común, así que no hizo falta extenderla (a diferencia de
 * `scene/road.ts` en la Fase 8.8, que sí necesitó parámetros extra).
 *
 * Auditoría previa a esta migración: existía una extracción paralela
 * desconectada en `scene/sun.ts` (nombre de archivo distinto al pedido,
 * `buildHorizonSun` sin usar en `engine.ts`). Se comparó línea por línea
 * contra el inline real: geometría, material, uniforms, colores,
 * posición y fórmula de `dayLift` eran idénticos, así que su lógica se
 * conservó — pero el archivo tenía una opción `fog: THREE.FogExp2` sin
 * uso real en el cuerpo (el inline nunca lee `this.fog` acá), que se
 * quitó por no corresponder a nada de la versión real. El archivo se
 * renombró a `scene/horizon-sun.ts` como pide esta fase y se conectó
 * desde `engine.ts`.
 */

import * as THREE from 'three'
import { SUN_VERTEX_SHADER, SUN_FRAGMENT_SHADER } from '../shaders/sun'
import { lerpDayColor } from '../utils/math'
import type { Updater } from './sky'

export interface HorizonSunBuilderOptions {
  farGroup: THREE.Group
}

/**
 * Construye el sol/luna bajo de horizonte sobre `farGroup`. Genera un
 * `THREE.Mesh` plano con `ShaderMaterial` de banda cortada. Devuelve un
 * único `updater: Updater` que anima posición e intensidad de color según
 * `dayPhase`.
 */
export function buildHorizonSunScene(options: HorizonSunBuilderOptions): Updater {
  const { farGroup } = options

  const uniforms = { time: { value: 0 }, introFade: { value: 0 } }
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      coreColor: { value: new THREE.Color(0xff5b7c) },
      rimColor: { value: new THREE.Color(0xffb04d) },
    },
    vertexShader: SUN_VERTEX_SHADER,
    fragmentShader: SUN_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(46, 46, 1, 1), material)
  sun.position.set(-2, 4.5, -55)
  farGroup.add(sun)

  // Referencias cacheadas (evita re-atravesar `material.uniforms.X.value`
  // y `sun.position` en cada frame dentro del updater — mismo criterio
  // aplicado en el resto de `scene/*.ts`). `time`/`introFade` son el
  // mismo objeto que `uniforms.time`/`uniforms.introFade` porque el
  // spread superficial de arriba copia las referencias, no clona los
  // valores.
  const timeUniform = uniforms.time
  const introFadeUniform = uniforms.introFade
  const coreColorValue = material.uniforms.coreColor.value
  const rimColorValue = material.uniforms.rimColor.value
  const sunPosition = sun.position

  const updater: Updater = (elapsed, _delta, intro, dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    timeUniform.value = elapsed
    introFadeUniform.value = intro
    const dayLift = 0.5 + 0.5 * Math.cos(dayPhase * Math.PI * 2)
    sunPosition.y = 4.5 + dayLift * 2.5
    coreColorValue.setHex(lerpDayColor(dayPhase, 0xff5b7c, 0xff3d78, 0xff9060))
    rimColorValue.setHex(lerpDayColor(dayPhase, 0xffb04d, 0xff6088, 0x88b0ff))
  }

  return updater
}
