/**
 * Sky dome builder for the GTA6 Zona WebGL engine.
 * Creates the procedural sky dome with day/night cycle integration.
 */

import * as THREE from 'three'
import { SKY_VERTEX_SHADER, SKY_FRAGMENT_SHADER } from '../shaders/sky'
import type { QualityProfile } from '../core/quality'

export interface SkyDomeUniforms {
  time: { value: number }
  dayPhase: { value: number }
  introFade: { value: number }
  humidity: { value: number }
  fogColor: { value: THREE.Color }
}

/**
 * Firma común de 11 parámetros que reutilizan directamente la mayoría de
 * builders de `scene/*.ts` (ver `import type { Updater } from './sky'` en
 * cada archivo). Tres builders definen su propia firma especializada en
 * vez de reutilizar esta — `LightsUpdater` (`./lights`), `RoadUpdater`
 * (`./road`) e `ImageBillboardsUpdater` (`./image-billboards`) — porque
 * cada uno depende de datos dinámicos distintos a estos 11 (p. ej.
 * `camera` o `roadFlow`); ver el comentario de cabecera de cada uno de
 * esos archivos para el detalle completo de por qué diverge. Aparte,
 * fuera de `scene/`, `engine.ts` define `SceneUpdater`, un tipo interno
 * de 3 parámetros (`elapsed, delta, intro`) al que el motor reduce cada
 * uno de estos updaters mediante un closure antes de registrarlo en su
 * loop de animación — `Updater` y `SceneUpdater` son intencionalmente
 * tipos distintos y no deben confundirse ni unificarse.
 */
export type Updater = (
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
  entityPresence: number
) => void

export interface SkyDomeBuilderOptions {
  humidity: number
  fog: THREE.FogExp2
  skyGroup: THREE.Group
  quality: QualityProfile
}

/**
 * Construye el domo de cielo procedural sobre `skyGroup`. Genera un
 * `THREE.Mesh` esférico (`BackSide`) con `ShaderMaterial` del ciclo
 * día/noche. Devuelve `{ uniforms, updater }`; `updater: Updater` (tipo
 * base, ver arriba) anima tiempo, fase del día, humedad y color de niebla.
 */
export function buildSkyDome(
  options: SkyDomeBuilderOptions
): { uniforms: SkyDomeUniforms; updater: Updater } {
  const { humidity, fog, skyGroup } = options

  const uniforms: SkyDomeUniforms = {
    time: { value: 0 },
    dayPhase: { value: 0.42 },
    introFade: { value: 0 },
    humidity: { value: humidity },
    fogColor: { value: fog.color.clone() },
  }

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: uniforms.time,
      dayPhase: uniforms.dayPhase,
      introFade: uniforms.introFade,
      humidity: uniforms.humidity,
      fogColor: uniforms.fogColor,
    },
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })

  const dome = new THREE.Mesh(new THREE.SphereGeometry(85, 48, 32), material)
  dome.frustumCulled = false
  skyGroup.add(dome)

  const updater: Updater = (elapsed, _delta, intro, dayPhase, currentHumidity, currentFog, _entityPace, _entityUnrest, _scrollVelocity, _pointerIntent, _entityPresence) => {
    uniforms.time.value = elapsed
    uniforms.dayPhase.value = dayPhase
    uniforms.introFade.value = intro
    uniforms.humidity.value = currentHumidity
    uniforms.fogColor.value.copy(currentFog)
  }

  return { uniforms, updater }
}
