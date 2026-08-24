/**
 * Coreografía de cámara — coreografiado por `SHOTS`, fusión continua entre
 * tomas en vez de ruido sin fin.
 *
 * Extraído literalmente de `computeShotFrame()`, método privado de
 * `GTA6ZonaWebGLEngine` (ver `engine.ts`). Es una función pura: no lee ni
 * escribe ningún campo de instancia — solo recibe `elapsed` y
 * `totalShotDuration` como parámetros y devuelve el frame calculado a
 * partir de las constantes `SHOTS`/`FALLBACK_SHOT` de `config/scene.ts`.
 * Por eso es EXTRAÍBLE AHORA (bajo riesgo): no hay estado por-frame
 * involucrado, no hay uniforms, no hay nada que solo se pueda verificar
 * corriendo el motor en un navegador — se verifica con `tsc` y lectura de
 * código, igual que cualquier función pura.
 *
 * NO se tocó el resto del loop de cámara (el lerp hacia `dolly`/
 * `introStartPos`, el parallax de cursor, el handheld shake, el FOV
 * dinámico): todo eso sigue dentro de la closure `loop` en `start()`,
 * fuera de alcance de esta fase.
 */

import * as THREE from 'three'
import { SHOTS, FALLBACK_SHOT } from '../config/scene'
import { smootherstep } from '../utils/math'

export interface ShotFrame {
  pos: THREE.Vector3
  look: THREE.Vector3
  fovBias: number
}

/**
 * Proviene de `computeShotFrame` en `GTA6ZonaWebGLEngine`. Mismo cálculo
 * de índice/interpolación entre tomas consecutivas de `SHOTS`, misma
 * guarda contra `SHOTS` vacío o duración total 0 (sin esto, `%` por 0
 * produce NaN y la cámara desaparece del encuadre).
 */
export function computeShotFrame(elapsed: number, totalShotDuration: number): ShotFrame {
  if (SHOTS.length === 0 || totalShotDuration <= 0) {
    return { pos: FALLBACK_SHOT.pos.clone(), look: FALLBACK_SHOT.look.clone(), fovBias: FALLBACK_SHOT.fovBias }
  }

  const t = elapsed % totalShotDuration
  let acc = 0
  for (let i = 0; i < SHOTS.length; i++) {
    const shot = SHOTS[i]
    const next = SHOTS[(i + 1) % SHOTS.length]
    if (t < acc + shot.duration || i === SHOTS.length - 1) {
      const local = smootherstep((t - acc) / shot.duration)
      return {
        pos: shot.pos.clone().lerp(next.pos, local),
        look: shot.look.clone().lerp(next.look, local),
        fovBias: shot.fovBias + (next.fovBias - shot.fovBias) * local,
      }
    }
    acc += shot.duration
  }
  return { pos: SHOTS[0].pos.clone(), look: SHOTS[0].look.clone(), fovBias: 0 }
}
