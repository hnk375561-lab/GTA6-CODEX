/**
 * Lifecycle orchestration for the AutoFicha WebGL engine.
 *
 * Este módulo NO contiene el loop de animación (cámara, uniforms, día/noche,
 * parallax) — eso permanece en `engine.ts` (closure `loop` dentro de
 * `start()`), fuera de alcance de esta extracción. Lo que vive acá es
 * exclusivamente el SCHEDULING del ciclo de vida del `WebGLRenderer`:
 * cuándo se crea, cuándo se redimensiona, cuándo se detecta que el
 * documento está oculto, cuándo se pierde/recupera el contexto GPU, y
 * cuándo se liberan los recursos de GPU en `dispose()`.
 *
 * Cada función es una transcripción literal, verificada línea por línea,
 * del método privado equivalente que existía inline en
 * `AutoFichaWebGLEngine` (ver comentario sobre cada una). No reemplaza ni
 * reutiliza la implementación paralela y no verificada que este archivo
 * tenía antes (`createLifecycleState` / `createAnimationLoop`): esa
 * reimplementación del loop usaba un `Updater` de 11 parámetros que no
 * coincide con la firma real que `engine.ts` usa hoy, y no había forma de
 * confirmar que fuera funcionalmente idéntica sin correr el motor en un
 * navegador. Por eso este archivo fue reescrito desde cero con un alcance
 * más chico pero verificable: pura orquestación, sin matemática visual.
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import type { QualityProfile } from './quality'

/**
 * Proviene del constructor de `AutoFichaWebGLEngine` (creación inline de
 * `this.renderer`). Mismas opciones, mismo orden de configuración
 * (`setClearColor` → `setPixelRatio` → `toneMapping` →
 * `toneMappingExposure` → `outputColorSpace`) que antes vivía inline.
 */
export function createRenderer(canvas: HTMLCanvasElement, quality: QualityProfile): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: quality.tier === 'high',
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxDpr))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.outputColorSpace = THREE.SRGBColorSpace
  return renderer
}

export interface ResizeTargets {
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  composer: EffectComposer
  bloomPass: UnrealBloomPass
  bokehPass: BokehPass | null
  fxaaPass: FXAAPass
  quality: QualityProfile
}

/**
 * Proviene de `handleResize` en `AutoFichaWebGLEngine`. Mismo cálculo de
 * `width`/`height`/`pixelRatio` a partir de `window.*` y mismas llamadas
 * de propagación a cámara/renderer/composer/passes, en el mismo orden.
 */
export function resizeRendererAndPasses(targets: ResizeTargets): void {
  const { camera, renderer, composer, bloomPass, bokehPass, fxaaPass, quality } = targets
  const width = window.innerWidth
  const height = window.innerHeight
  const pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxDpr)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(width, height, false)
  composer.setSize(width, height)
  bloomPass.resolution.set(width * pixelRatio, height * pixelRatio)
  if (bokehPass) {
    bokehPass.setSize(width, height)
  }
  fxaaPass.setSize(width, height)
}

/**
 * Proviene de `handleVisibility` en `AutoFichaWebGLEngine`. Misma
 * condición (`document.hidden`); el llamador sigue siendo responsable de
 * asignar el resultado a `this.paused`.
 */
export function isDocumentHidden(): boolean {
  return document.hidden
}

export interface ContextLostResult {
  contextLost: boolean
  rafId: number | null
}

/**
 * Proviene de `handleContextLost` en `AutoFichaWebGLEngine`. Mismo
 * `event.preventDefault()` (necesario para que el navegador le dé al
 * motor la oportunidad de recuperar el contexto) + misma cancelación del
 * frame en vuelo. El llamador asigna `contextLost`/`rafId` sobre `this`.
 */
export function handleContextLost(event: Event, rafId: number | null): ContextLostResult {
  event.preventDefault()
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  return { contextLost: true, rafId }
}

export interface ContextRestoredParams {
  lifecycle: 'idle' | 'running' | 'disposed'
  rafId: number | null
  loopFn: (() => void) | null
}

/**
 * Proviene de `handleContextRestored` en `AutoFichaWebGLEngine`. Mismo
 * criterio de reanudación (`lifecycle === 'running' && rafId === null &&
 * loopFn`) — Three.js re-crea los recursos de GPU derivados del contexto
 * por su cuenta, acá solo hace falta retomar el mismo `loopFn` ya
 * existente vía `requestAnimationFrame`.
 */
export function handleContextRestored(params: ContextRestoredParams): ContextLostResult {
  const { lifecycle, loopFn } = params
  let { rafId } = params
  if (lifecycle === 'running' && rafId === null && loopFn) {
    rafId = requestAnimationFrame(loopFn)
  }
  return { contextLost: false, rafId }
}

export interface DisposeSceneResourcesParams {
  scene: THREE.Scene
  envRenderTarget: THREE.WebGLRenderTarget | null
  imageTextures: THREE.Texture[]
  composer: EffectComposer
  renderer: THREE.WebGLRenderer
}

/**
 * Proviene del cuerpo de `dispose()` en `AutoFichaWebGLEngine` (la parte
 * de liberación de recursos GPU, no la de estado de la propia instancia:
 * `rafId`/`loopFn`/`abortController`/`unsubscribeSceneBus` siguen
 * gestionándose en `engine.ts`). Mismo recorrido de `scene.traverse`
 * liberando geometría/material, mismo dispose de `envRenderTarget`,
 * `imageTextures`, cada pass del `composer`, el `composer` y el
 * `renderer`, en el mismo orden.
 */
export function disposeSceneResources(params: DisposeSceneResourcesParams): void {
  const { scene, envRenderTarget, imageTextures, composer, renderer } = params

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
      obj.geometry?.dispose?.()
      const material = obj.material as THREE.Material | THREE.Material[]
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose?.()
    }
  })
  scene.environment = null
  envRenderTarget?.dispose()
  imageTextures.forEach((t) => t.dispose())

  composer.passes.forEach((pass) => pass.dispose?.())
  composer.dispose()
  renderer.dispose()
}
