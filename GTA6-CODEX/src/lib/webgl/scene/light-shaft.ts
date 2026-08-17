/**
 * Light shaft builder for the GTA6 Codex WebGL engine.
 * Haces de neón que suben desde la torre focal (magenta + cian, el
 * segundo condicionado a `quality.tier !== 'low'`).
 *
 * Fase 8.10 — geometría, material, uniforms y valores idénticos a la
 * versión inline anterior de `engine.ts`; solo se movieron acá
 * (`buildLightShaftScene`). Igual que en `scene/sky.ts`/`scene/road.ts`,
 * el `updater` usa la firma común de 11 parámetros de `scene/*.ts`.
 *
 * Auditoría previa a esta migración: existía una extracción paralela
 * desconectada en `scene/lightShaft.ts` (nombre de archivo con otra
 * convención a la pedida por esta fase, no importada desde
 * `engine.ts`). Se comparó línea por línea contra el inline real:
 * geometría, ambos materiales (magenta/cian), posiciones, rotaciones,
 * escala del segundo haz y la condición `quality.tier !== 'low'` eran
 * idénticos. Un detalle sutil que también coincidía: ambos materiales
 * comparten el mismo objeto de uniforms `{ time, introFade }` vía
 * spread superficial (`{ ...uniforms, shaftColor: ... }`), así que
 * escribir `material.uniforms.time.value` en el updater también
 * actualiza el segundo haz sin necesidad de tocarlo aparte — igual que
 * en el inline. La única diferencia real: la versión desconectada
 * devolvía solo el `updater`, sin exponer el objeto de uniforms; el
 * inline sí lo expone como `this.shaftUniforms`, requerido por el guard
 * `assertFullyInitialized()` de `engine.ts`. Se adaptó el valor de
 * retorno a `{ uniforms, updater }` (mismo patrón que `scene/sky.ts` y
 * `scene/road.ts`) para cerrar ese hueco sin cambiar ningún valor
 * numérico ni ninguna lógica de render.
 */

import * as THREE from 'three'
import { SHAFT_VERTEX_SHADER, SHAFT_FRAGMENT_SHADER } from '../shaders/neon'
import type { QualityProfile } from '../core/quality'
import type { Updater } from './sky'

export interface LightShaftUniforms {
  time: { value: number }
  introFade: { value: number }
}

export interface LightShaftBuilderOptions {
  farGroup: THREE.Group
  quality: QualityProfile
}

/**
 * Construye los haces de neón que suben desde la torre focal (magenta
 * siempre, cian condicionado a `quality.tier !== 'low'`), sobre
 * `farGroup`. Genera 1 o 2 `THREE.Mesh` con `ShaderMaterial` aditivo.
 * Devuelve `{ uniforms, updater }`; `updater: Updater` anima ambos haces
 * a la vez (comparten el mismo objeto de uniforms).
 */
export function buildLightShaftScene(
  options: LightShaftBuilderOptions
): { uniforms: LightShaftUniforms; updater: Updater } {
  const { farGroup, quality } = options

  const uniforms: LightShaftUniforms = { time: { value: 0 }, introFade: { value: 0 } }
  const geometry = new THREE.PlaneGeometry(14, 46, 1, 1)
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, shaftColor: { value: new THREE.Color(0xff5fa8) } },
    vertexShader: SHAFT_VERTEX_SHADER,
    fragmentShader: SHAFT_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })

  // Reubicado como el haz de neón que sube desde la torre focal, en vez de
  // una fuente de luz genérica en el costado de la escena.
  const shaft = new THREE.Mesh(geometry, material)
  shaft.position.set(-3.2, 8, -5)
  shaft.rotation.z = 0.05
  shaft.rotation.x = -0.06
  farGroup.add(shaft)

  if (quality.tier !== 'low') {
    const shaft2 = new THREE.Mesh(
      geometry.clone(),
      new THREE.ShaderMaterial({
        uniforms: { ...uniforms, shaftColor: { value: new THREE.Color(0x22d3ee) } },
        vertexShader: SHAFT_VERTEX_SHADER,
        fragmentShader: SHAFT_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    )
    shaft2.position.set(5.5, 6, -8)
    shaft2.rotation.z = -0.08
    shaft2.rotation.x = -0.04
    shaft2.scale.set(0.7, 0.85, 1)
    farGroup.add(shaft2)
  }

  const updater: Updater = (elapsed, _delta, intro, _dayPhase, _humidity, _fog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    material.uniforms.time.value = elapsed
    material.uniforms.introFade.value = intro
  }

  return { uniforms, updater }
}
