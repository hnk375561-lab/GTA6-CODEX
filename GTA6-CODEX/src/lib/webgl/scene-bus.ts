'use client'

/**
 * Bus de escena — el puente entre la UI real (secciones, hover de cards,
 * scroll) y el motor de fondo (`engine.ts`).
 * ---------------------------------------------------------------------------
 * Pub/sub minimalista (sin dependencias, sin re-renders de React) donde la
 * UI publica intención y el motor se suscribe para decidir cómo traducirla a
 * luz/intensidad del fondo.
 *
 * Se implementa como singleton fuera de React a propósito: el motor corre en
 * un `requestAnimationFrame` propio y no debe depender del ciclo de render
 * de React para leer estos valores.
 *
 * Este archivo solo expone los canales que algún consumidor real lee hoy.
 * Se sacaron (auditoría de agosto 2026, ver CHANGELOG) varios canales que
 * quedaron escribiéndose sin que nadie los leyera nunca — plomería viva del
 * lado emisor pero sin ningún efecto observable:
 *  - `entityAtmosphere`: publicado por cada ficha de entidad, pero el motor
 *    actual (Canvas 2D, ver `engine.ts`) nunca lo lee — pertenecía al motor
 *    three.js anterior y no se volvió a conectar tras el rediseño.
 *  - `transition`/`SceneTransition` y `hero`/`HeroState`: se derivaban solas
 *    de cada cambio de foco, pero ningún consumidor las leía.
 *  - `navigation`/`NavigationTransition`: `PageTransitionBridge` lo escribía,
 *    pero maneja el fundido de transición con su propio estado de React —
 *    nunca leyó de vuelta el bus.
 *  - Segundo parámetro (`source`) de `setPointerIntent`: ningún caller lo
 *    pasaba nunca.
 * `scroll.progress`/`scroll.velocity`/`scroll.direction` SÍ están vivos:
 * `engine.ts` lee `velocity`, y `ScrollTelemetryBridge` lee `progress` y
 * `direction` para `--scroll-dir`/`data-scroll-phase` — se mantienen tal
 * cual.
 * Si en el futuro alguno de los canales eliminados vuelve a hacer falta,
 * agregarlo de nuevo es
 * barato — mantenerlo muerto en el medio solo suma superficie a leer.
 */

export interface SceneFocus {
  /** Id semántico de la sección visible (ver `data-scene-section`). */
  sectionId: string | null
  /** 0 → la sección apenas entra en viewport, 1 → ocupa el viewport. */
  progress: number
}

/**
 * "Ambiente" real del fondo en el frame actual — la mitad del puente que va
 * MOTOR → DOM (el resto del archivo es UI → motor). Publicado por
 * `AutoFichaWebGLEngine` en su loop de render y consumido por
 * `SceneAmbientBridge`, que lo escribe como variables CSS en `<html>` para
 * que cards, hero y demás superficies reaccionen a la misma luz/intensidad
 * que el fondo.
 */
export interface SceneAmbient {
  /** Ángulo (grados, convención de `linear-gradient` CSS) de la luz clave. */
  lightAngleDeg: number
  /** 0 = frío (verde), 1 = cálido (naranja). */
  warmth: number
  /** 0..1, brillo general del fondo en este momento. */
  intensity: number
  /** 0..1, pulso transitorio (llegada a una sección nueva). Decae solo. */
  kick: number
  /** 0..1, progreso de la coreografía de apertura inicial. */
  intro: number
}

/**
 * Lo que reciben los suscriptores de `subscribeAmbient`: superset de
 * `SceneAmbient` con señales derivadas para color/densidad/profundidad del
 * DOM, calculadas a partir de los mismos 5 números que ya publica
 * `engine.ts`.
 */
export interface SceneAmbientSignals extends SceneAmbient {
  /** Desvío de matiz sugerido en grados (-30..30), derivado de `warmth`. */
  hueShiftDeg: number
  /** Densidad sugerida de partícula/polvo en el DOM (0..~1.4). */
  particleDensity: number
  /** Profundidad/desenfoque sugeridos para capas parallax del DOM (0..1). */
  depth: number
  /** Saturación sugerida (0..1). */
  saturation: number
}

/**
 * Progreso de scroll normalizado de la página completa (0..1) + velocidad y
 * dirección instantáneas, publicado por `scroll-telemetry.tsx` a partir del
 * scroll nativo real. `velocity` lo lee `engine.ts` (intensidad de
 * streaks); `progress`/`direction` los lee `ScrollTelemetryBridge`
 * (`--scroll-dir`, `data-scroll-phase`).
 */
export interface ScrollTelemetry {
  progress: number
  velocity: number
  direction: -1 | 0 | 1
}

// ---------------------------------------------------------------------------
// Defaults y helpers puros (sin estado, fáciles de razonar/testear)
// ---------------------------------------------------------------------------

const DEFAULT_AMBIENT: SceneAmbient = {
  lightAngleDeg: 135,
  warmth: 0.5,
  intensity: 0.55,
  kick: 0,
  intro: 1,
}

const DEFAULT_SCROLL: ScrollTelemetry = { progress: 0, velocity: 0, direction: 0 }

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

/** Devuelve `value` si es un número finito, o `fallback` si llega NaN/Infinity (defensa ante bugs futuros del lado del motor, antes de que el dato llegue a una CSS var). */
const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)

/** Deriva `SceneAmbientSignals` a partir de un `SceneAmbient` crudo, saneando cualquier valor no finito con el default correspondiente. */
function deriveAmbientSignals(value: SceneAmbient): SceneAmbientSignals {
  const lightAngleDeg = finiteOr(value.lightAngleDeg, DEFAULT_AMBIENT.lightAngleDeg)
  const warmth = clamp01(finiteOr(value.warmth, DEFAULT_AMBIENT.warmth))
  const intensity = clamp01(finiteOr(value.intensity, DEFAULT_AMBIENT.intensity))
  const kick = clamp01(finiteOr(value.kick, DEFAULT_AMBIENT.kick))
  const intro = clamp01(finiteOr(value.intro, DEFAULT_AMBIENT.intro))

  return {
    lightAngleDeg,
    warmth,
    intensity,
    kick,
    intro,
    hueShiftDeg: (warmth - 0.5) * 60,
    particleDensity: clamp01(intensity * 0.8 + kick * 0.6),
    depth: clamp01(intro * 0.7 + kick * 0.3),
    saturation: clamp01(0.55 + warmth * 0.25 + intensity * 0.2),
  }
}

type Listener = () => void
type AmbientListener = (ambient: SceneAmbientSignals) => void

class WebGLSceneBus {
  // --- UI → motor: estado discreto (dispara `emit()` solo ante cambios reales) ---
  private focus: SceneFocus = { sectionId: null, progress: 0 }
  private pointerIntent = 0
  private scroll: ScrollTelemetry = DEFAULT_SCROLL

  private listeners = new Set<Listener>()

  // --- Motor → DOM: estado continuo (throttled por el propio motor) ---
  private ambient: SceneAmbientSignals = deriveAmbientSignals(DEFAULT_AMBIENT)
  private ambientListeners = new Set<AmbientListener>()

  private emit() {
    this.listeners.forEach((listener) => listener())
  }

  /** El motor (u otro consumidor) se suscribe acá; devuelve función de limpieza. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Publicado por `useSectionSceneFocus` en cada sección instrumentada. */
  setSectionFocus(sectionId: string | null, progress: number) {
    const clamped = clamp01(finiteOr(progress, this.focus.progress))
    if (this.focus.sectionId === sectionId && this.focus.progress === clamped) return
    this.focus = { sectionId, progress: clamped }
    this.emit()
  }

  /** Publicado por elementos interactivos (cards) al recibir hover/focus real. */
  setPointerIntent(value: number) {
    const clamped = clamp01(finiteOr(value, this.pointerIntent))
    if (this.pointerIntent === clamped) return
    this.pointerIntent = clamped
    this.emit()
  }

  /**
   * Publicado por `ScrollTelemetryProvider` a partir del scroll nativo real.
   * `progress`/`direction` los lee `ScrollTelemetryBridge`; `velocity` la
   * lee `engine.ts`.
   */
  setScrollProgress(progress: number, velocity = 0) {
    const clampedProgress = clamp01(finiteOr(progress, this.scroll.progress))
    const safeVelocity = finiteOr(velocity, 0)
    const direction: ScrollTelemetry['direction'] = safeVelocity > 1e-4 ? 1 : safeVelocity < -1e-4 ? -1 : 0
    if (
      this.scroll.progress === clampedProgress &&
      this.scroll.velocity === safeVelocity &&
      this.scroll.direction === direction
    ) {
      return
    }
    this.scroll = { progress: clampedProgress, velocity: safeVelocity, direction }
    this.emit()
  }

  /** Snapshot congelado: nadie río abajo puede mutar el estado del bus por accidente. */
  getSnapshot() {
    return Object.freeze({
      focus: this.focus,
      pointerIntent: this.pointerIntent,
      scroll: this.scroll,
    })
  }

  /**
   * El motor se suscribe acá — se le entrega el valor inmediatamente al
   * suscribirse para no esperar al primer frame (evita un "flash" del
   * fallback de :root al primer render post-mount).
   */
  subscribeAmbient(listener: AmbientListener): () => void {
    this.ambientListeners.add(listener)
    listener(this.ambient)
    return () => {
      this.ambientListeners.delete(listener)
    }
  }

  /**
   * Publicado por el motor en cada frame (throttled internamente por el
   * motor). Deliberadamente separado de `emit()`: cambia constantemente y
   * solo le interesa a los puentes DOM que pintan variables CSS, no a los
   * listeners de foco/intención que reaccionan a cambios discretos.
   */
  publishAmbient(value: SceneAmbient) {
    this.ambient = deriveAmbientSignals(value)
    this.ambientListeners.forEach((listener) => listener(this.ambient))
  }

  getAmbient(): SceneAmbientSignals {
    return this.ambient
  }

  /**
   * Reinicia el bus a su estado inicial y desconecta a todos los
   * suscriptores. No lo usa nadie en producción — pensado para tests
   * aislados o HMR agresivo.
   */
  reset() {
    this.focus = { sectionId: null, progress: 0 }
    this.pointerIntent = 0
    this.scroll = DEFAULT_SCROLL
    this.ambient = deriveAmbientSignals(DEFAULT_AMBIENT)
    this.listeners.clear()
    this.ambientListeners.clear()
  }
}

export const webglSceneBus = new WebGLSceneBus()
export type WebGLSceneSnapshot = ReturnType<WebGLSceneBus['getSnapshot']>
