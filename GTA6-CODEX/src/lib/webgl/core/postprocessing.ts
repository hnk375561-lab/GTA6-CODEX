/**
 * Pipeline de postprocessing del motor GTA6 Codex WebGL.
 *
 * Extraído literalmente del bloque de creación en el constructor de
 * `GTA6CodexWebGLEngine` (ver `engine.ts`): `EffectComposer` + `RenderPass`
 * + `BokehPass` (condicional a `quality.enableBokeh`) + `UnrealBloomPass` +
 * `ShaderPass` de grade + `FXAAPass` + `OutputPass`, en ese mismo orden.
 *
 * Es EXTRACCIÓN MECÁNICA, no un rediseño: mismos valores, mismos
 * parámetros, mismo orden de `addPass`. No incluye:
 *  - El resize de los passes (`bloomPass.resolution.set`, `bokehPass.setSize`,
 *    `fxaaPass.setSize`) — eso ya vive en `resizeRendererAndPasses`
 *    (`core/lifecycle.ts`, Fase 3) y se invoca aparte, después de crear
 *    este pipeline, vía `engine.ts` → `this.handleResize()`.
 *  - Los uniforms del `gradePass`/`bloomPass.strength` actualizados cuadro
 *    a cuadro — eso vive dentro de la closure `loop` en `start()`, fuera
 *    de alcance de esta fase.
 *  - El dispose de los passes — eso ya vive en `disposeSceneResources`
 *    (`core/lifecycle.ts`, Fase 3).
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { GRADE_SHADER } from '../shaders/postprocess'
import type { QualityProfile } from './quality'

export interface PostProcessingParams {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /**
   * Aceptados por firma/consistencia con `resizeRendererAndPasses`
   * (`core/lifecycle.ts`), pero NO se usan dentro de esta función: el
   * pipeline original tampoco dimensionaba nada en el momento de crear
   * los passes — el sizing real ocurre enteramente en
   * `resizeRendererAndPasses`, invocada por separado inmediatamente
   * después (`engine.ts` → `this.handleResize()` en el constructor).
   * Mantenerlos sin usar acá evita que esta función haga algo que el
   * código original no hacía.
   */
  width: number
  height: number
  quality: QualityProfile
}

export interface PostProcessingPipeline {
  composer: EffectComposer
  bloomPass: UnrealBloomPass
  bokehPass: BokehPass | null
  gradePass: ShaderPass
  fxaaPass: FXAAPass
}

/**
 * Proviene del bloque de creación del pipeline en el constructor de
 * `GTA6CodexWebGLEngine`. Transcripción literal: mismo orden de
 * `composer.addPass(...)` (Render → Bokeh condicional → Bloom → Grade →
 * FXAA → Output), mismos valores de `UnrealBloomPass` (resolución inicial
 * `(1, 1)` — se sobreescribe enseguida vía `resizeRendererAndPasses` —,
 * `strength = 0.85 * quality.bloomScale`, `radius = 0.55`,
 * `threshold = 0.16`) y mismos parámetros de `BokehPass`
 * (`focus: 22, aperture: 0.0016, maxblur: 0.007`).
 */
export function createPostProcessingPipeline(params: PostProcessingParams): PostProcessingPipeline {
  const { renderer, scene, camera, quality } = params

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  let bokehPass: BokehPass | null = null
  if (quality.enableBokeh) {
    bokehPass = new BokehPass(scene, camera, {
      focus: 22,
      aperture: 0.0016,
      maxblur: 0.007,
    })
    composer.addPass(bokehPass)
  }

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    0.85 * quality.bloomScale,
    0.55,
    0.16
  )
  composer.addPass(bloomPass)

  const gradePass = new ShaderPass(GRADE_SHADER)
  composer.addPass(gradePass)

  const fxaaPass = new FXAAPass()
  composer.addPass(fxaaPass)

  composer.addPass(new OutputPass())

  return { composer, bloomPass, bokehPass, gradePass, fxaaPass }
}
