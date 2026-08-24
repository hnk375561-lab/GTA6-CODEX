/**
 * Road builder for the GTA6 Zona WebGL engine.
 * Carretera nocturna: horizonte, no decoración — atmósfera y fuga de
 * perspectiva.
 *
 * Fase 8.8 — geometría, material, uniforms y valores idénticos a la
 * versión inline anterior de `engine.ts`; solo se movieron acá
 * (`buildRoadScene`). A diferencia de `scene/sky.ts`/`scene/water.ts`, la
 * versión inline de este builder no leía sus valores dinámicos
 * (`humidity`, `reducedMotion`, `entityPace`) a través de la firma común
 * de 11 parámetros de `scene/*.ts`, sino directo de `this` en el
 * `engine.ts` original — y además dependía de `this.roadFlow`, un
 * acumulador que vive y se actualiza en el loop de animación de
 * `engine.ts` (ver `ROAD_FLOW_WRAP`), no acá. Ese acumulador NO se tocó
 * ni se duplicó: sigue siendo responsabilidad exclusiva del loop de
 * `engine.ts`, que lo pasa acá como parámetro en cada frame. Por eso el
 * `Updater` de este archivo extiende la firma común de 11 parámetros con
 * dos parámetros adicionales al final (`reducedMotion`, `roadFlow`) en
 * vez de reutilizar el tipo `Updater` de `./sky` tal cual — reutilizarlo
 * sin esos dos valores hubiera forzado a este builder a mantener su
 * propio acumulador de `flow` desconectado del real, cambiando el
 * comportamiento frente a la versión inline.
 */

import * as THREE from 'three'
import { ROAD_VERTEX_SHADER, ROAD_FRAGMENT_SHADER } from '../shaders/road'

export interface RoadUniforms {
  time: { value: number }
  introFade: { value: number }
}

/**
 * Firma propia (no `Updater` de `./sky`): extiende los 11 parámetros
 * comunes con `reducedMotion`/`roadFlow`, ambos necesarios para el efecto
 * de flujo/heat-shimmer real — ver la nota de arquitectura al inicio del
 * archivo para el detalle completo de por qué diverge.
 */
export type RoadUpdater = (
  elapsed: number,
  delta: number,
  intro: number,
  dayPhase: number,
  humidity: number,
  fogColor: THREE.Color,
  entityPace: number,
  entityUnrest: number,
  scrollVelocity: number,
  pointerIntent: number,
  entityPresence: number,
  reducedMotion: boolean,
  roadFlow: number
) => void

export interface RoadBuilderOptions {
  farGroup: THREE.Group
}

/**
 * Construye la carretera nocturna (horizonte con fuga de perspectiva)
 * sobre `farGroup`. Genera un `THREE.Mesh` plano con `ShaderMaterial`.
 * Devuelve `{ uniforms, updater }`; `updater: RoadUpdater` (firma propia,
 * ver arriba) anima flujo, humedad y heat-shimmer, recibiendo
 * `reducedMotion`/`roadFlow` además de los 11 parámetros comunes.
 */
export function buildRoadScene(
  options: RoadBuilderOptions
): { uniforms: RoadUniforms; updater: RoadUpdater } {
  const { farGroup } = options

  const geometry = new THREE.PlaneGeometry(220, 220, 1, 1)
  const uniforms: RoadUniforms = { time: { value: 0 }, introFade: { value: 0 } }
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      flow: { value: 0 },
      colorA: { value: new THREE.Color(0x22d3ee) },
      colorB: { value: new THREE.Color(0xff2d78) },
      humidity: { value: 0.45 },
      heatShimmer: { value: 0.0 },
    },
    vertexShader: ROAD_VERTEX_SHADER,
    fragmentShader: ROAD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const floor = new THREE.Mesh(geometry, material)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -13
  farGroup.add(floor)

  const updater: RoadUpdater = (
    elapsed,
    _delta,
    intro,
    _dayPhase,
    humidity,
    _fogColor,
    entityPace,
    _entityUnrest,
    _scrollVelocity,
    _pointerIntent,
    _entityPresence,
    reducedMotion,
    roadFlow
  ) => {
    material.uniforms.time.value = elapsed
    material.uniforms.introFade.value = intro
    material.uniforms.flow.value = roadFlow
    material.uniforms.humidity.value = humidity
    material.uniforms.heatShimmer.value = reducedMotion ? 0 : 0.35 + entityPace * 0.15
  }

  return { uniforms, updater }
}
