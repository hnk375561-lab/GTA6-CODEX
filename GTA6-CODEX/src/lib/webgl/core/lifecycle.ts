/**
 * Lifecycle management for the GTA6 Codex WebGL engine.
 * Handles the main animation loop, state updates, and disposal.
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { GRADE_SHADER } from '../shaders/postprocess'
import { lerpCyclic01, smootherstep } from '../utils/math'
import { webglSceneBus } from '../scene-bus'
import type { Updater } from '../scene/sky'
import type { DustUniforms } from '../scene/particles'

export interface LifecycleState {
  dayPhase: number
  dayPhaseTarget: number
  humidity: number
  pointer: { x: number; y: number }
  pointerTarget: { x: number; y: number }
  pointerVelocity: number
  scrollProgress: number
  scrollTarget: number
  scrollVelocity: number
  sceneMood: number
  sceneMoodTarget: number
  pointerIntent: number
  pointerIntentTarget: number
  entityWarmth: number
  entityWarmthTarget: number
  entityUnrest: number
  entityUnrestTarget: number
  entityPresence: number
  entityPresenceTarget: number
  entityPace: number
  entityPaceTarget: number
  entityFrame: number
  entityFrameTarget: number
  roadFlow: number
  arrivalKick: number
  introClimaxFired: boolean
  ambientFrameCounter: number
}

export interface LifecycleOptions {
  clock: THREE.Clock
  composer: EffectComposer
  bloomPass: UnrealBloomPass
  bokehPass: BokehPass | null
  gradePass: ShaderPass
  dustUniforms: DustUniforms
  fog: THREE.FogExp2
  keyLight: THREE.PointLight
  skyGroup: THREE.Group
  farGroup: THREE.Group
  midGroup: THREE.Group
  nearGroup: THREE.Group
  baseFogDensity: number
  reducedMotion: boolean
  tmpProjectVec: THREE.Vector3
  updaters: Updater[]
  ROAD_FLOW_WRAP: number
}

export function createLifecycleState(): LifecycleState {
  return {
    dayPhase: 0.42,
    dayPhaseTarget: 0.42,
    humidity: 0.45,
    pointer: { x: 0, y: 0 },
    pointerTarget: { x: 0, y: 0 },
    pointerVelocity: 0,
    scrollProgress: 0,
    scrollTarget: 0,
    scrollVelocity: 0,
    sceneMood: 0,
    sceneMoodTarget: 0,
    pointerIntent: 0,
    pointerIntentTarget: 0,
    entityWarmth: 0,
    entityWarmthTarget: 0,
    entityUnrest: 0,
    entityUnrestTarget: 0,
    entityPresence: 0,
    entityPresenceTarget: 0,
    entityPace: 1,
    entityPaceTarget: 1,
    entityFrame: 0,
    entityFrameTarget: 0,
    roadFlow: 0,
    arrivalKick: 0,
    introClimaxFired: false,
    ambientFrameCounter: 0,
  }
}

export function createAnimationLoop(
  state: LifecycleState,
  options: LifecycleOptions,
  startTime: number
): () => void {
  const {
    clock,
    composer,
    bloomPass,
    bokehPass,
    gradePass,
    dustUniforms,
    fog,
    keyLight,
    skyGroup,
    farGroup,
    midGroup,
    nearGroup,
    baseFogDensity,
    reducedMotion,
    tmpProjectVec,
    updaters,
    ROAD_FLOW_WRAP,
  } = options

  const introDuration = reducedMotion ? 0.4 : 3.1

  return () => {
    const delta = Math.min(clock.getDelta(), 0.05)
    const elapsed = clock.getElapsedTime()
    const sinceStart = elapsed - startTime
    const intro = smootherstep(sinceStart / introDuration)

    if (!state.introClimaxFired && intro >= 0.92 && !reducedMotion) {
      state.introClimaxFired = true
      state.arrivalKick = 1
    }

    const prevPointerX = state.pointer.x
    const prevPointerY = state.pointer.y
    state.pointer.x += (state.pointerTarget.x - state.pointer.x) * 0.07
    state.pointer.y += (state.pointerTarget.y - state.pointer.y) * 0.07
    state.pointerVelocity = Math.hypot(state.pointer.x - prevPointerX, state.pointer.y - prevPointerY)

    const prevScroll = state.scrollProgress
    state.scrollProgress += (state.scrollTarget - state.scrollProgress) * 0.06
    state.scrollVelocity = Math.abs(state.scrollProgress - prevScroll)

    state.sceneMood += (state.sceneMoodTarget - state.sceneMood) * 0.02
    state.pointerIntent += (state.pointerIntentTarget - state.pointerIntent) * 0.08
    state.entityWarmth += (state.entityWarmthTarget - state.entityWarmth) * 0.015
    state.entityUnrest += (state.entityUnrestTarget - state.entityUnrest) * 0.03
    state.entityPresence += (state.entityPresenceTarget - state.entityPresence) * 0.02
    state.entityPace += (state.entityPaceTarget - state.entityPace) * 0.02
    state.entityFrame += (state.entityFrameTarget - state.entityFrame) * 0.018

    const cyclicalTime = (elapsed * 0.004) % 1
    state.dayPhaseTarget = (cyclicalTime * 0.55 + state.sceneMood * 0.35 + state.scrollProgress * 0.1) % 1
    state.dayPhase = lerpCyclic01(state.dayPhase, state.dayPhaseTarget, reducedMotion ? 0.004 : 0.012)
    state.humidity = 0.38 + state.sceneMood * 0.22 + Math.sin(elapsed * 0.015) * 0.06

    state.roadFlow = (state.roadFlow + delta * 5 * state.entityPace) % ROAD_FLOW_WRAP

    // Call all updaters with the current state
    for (const update of updaters) {
      update(
        elapsed,
        delta,
        intro,
        state.dayPhase,
        state.humidity,
        fog.color,
        state.entityPace,
        state.entityUnrest,
        state.scrollVelocity,
        state.pointerIntent,
        state.entityPresence
      )
    }

    // Update dust uniforms directly (bypass pattern)
    dustUniforms.time.value = elapsed
    dustUniforms.mouseNDC.value.set(state.pointer.x, -state.pointer.y)
    dustUniforms.mouseStrength.value = reducedMotion ? 0 : Math.min(intro + state.pointerIntent * 0.6, 1.6)
    dustUniforms.introFade.value = intro

    // Update post-processing
    gradePass.uniforms.time.value = elapsed * 0.6
    gradePass.uniforms.fadeIn.value = intro
    gradePass.uniforms.dayPhase.value = state.dayPhase
    gradePass.uniforms.humidity.value = state.humidity
    gradePass.uniforms.grainStrength.value = 0.03 + state.entityUnrest * 0.025 + state.humidity * 0.012
    const kick = reducedMotion
      ? 0
      : Math.min(
          state.pointerVelocity * 1.3 +
            state.scrollVelocity * 6 +
            state.pointerIntent * 0.003 +
            state.entityUnrest * 0.0015,
          0.009
        )
    state.arrivalKick *= 0.92
    gradePass.uniforms.chromaKick.value = Math.min(kick + state.arrivalKick * 0.006, 0.014)
    bloomPass.strength = THREE.MathUtils.clamp(
      (0.8 * intro + (reducedMotion ? 0 : state.pointerIntent * 0.3) + state.entityPresence * 0.15 + state.arrivalKick * 0.35),
      0,
      2.5
    )
    gradePass.uniforms.bloomMix.value = bloomPass.strength * 0.08

    // Update groups
    skyGroup.position.x = -state.pointer.x * 0.15
    skyGroup.position.y = state.pointer.y * 0.1
    skyGroup.rotation.y = elapsed * 0.002

    farGroup.position.x = -state.pointer.x * 0.4 - state.scrollProgress * 0.6
    farGroup.position.y = state.pointer.y * 0.25
    midGroup.position.x = state.pointer.x * 1.1
    midGroup.position.y = -state.pointer.y * 0.7
    midGroup.rotation.y = state.scrollProgress * 0.35
    nearGroup.position.x = state.pointer.x * 2.1
    nearGroup.position.y = -state.pointer.y * 1.3

    // Update fog
    fog.density = THREE.MathUtils.clamp(
      baseFogDensity - state.entityFrame * 0.006 + state.humidity * 0.008 - Math.abs(state.dayPhase - 0.5) * 0.006,
      0.012,
      0.08
    )

    // Update bokeh if available
    if (bokehPass) {
      bokehPass.materialBokeh.uniforms.focus.value = 22 - state.scrollProgress * 7
    }

    // Render
    composer.render()

    // Publish ambient data to DOM (camera needs to be passed separately)
    state.ambientFrameCounter++
    if (state.ambientFrameCounter % 3 === 0) {
      // This will be handled by the main engine class
    }
  }
}
