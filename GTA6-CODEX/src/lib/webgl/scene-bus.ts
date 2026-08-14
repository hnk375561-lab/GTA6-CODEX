'use client'

/**
 * Bus de escena — el puente entre la UI real (secciones, hero, hover de
 * tarjetas) y el motor WebGL.
 * ---------------------------------------------------------------------------
 * Hasta ahora el motor vivía aislado: leía `window.scroll`/`pointermove`
 * directamente y no tenía forma de saber en qué parte *semántica* de la
 * interfaz estaba el usuario (¿hero?, ¿grid de categorías?, ¿hover sobre una
 * card?). Este módulo es un pub/sub minimalista (sin dependencias, sin
 * re-renders de React) donde la UI publica intención y el motor se suscribe
 * para decidir cómo traducirla a cámara/luz/partículas.
 *
 * Se implementa como singleton fuera de React a propósito: el motor corre en
 * un `requestAnimationFrame` propio y no debe depender del ciclo de render
 * de React para leer estos valores.
 */

export interface SceneFocus {
  /** Id semántico de la sección visible (ver `data-scene-section`). */
  sectionId: string | null
  /** 0 → la sección apenas entra en viewport, 1 → ocupa el viewport. */
  progress: number
}

/**
 * "Atmósfera" de la entidad cuya ficha está montada — reutiliza datos que
 * ya existen en el contenido (categoría, estado editorial, si es featured),
 * no inventa campos nuevos. Null cuando no hay ninguna ficha montada (home,
 * listados).
 */
export interface EntityAtmosphere {
  /** Valor de `EntityType` (ej. 'personajes', 'vehiculos'). */
  category: string
  /** Valor de `InformationStatus` (confirmado | rumor | nuestro). */
  status: string
  featured: boolean
}

/**
 * "Ambiente" real de la escena 3D en el frame actual — la mitad del puente
 * que va MOTOR → DOM (el resto del archivo es UI → motor). Publicado por
 * `GTA6CodexWebGLEngine` en su loop de render y consumido por
 * `SceneAmbientBridge`, que lo escribe como variables CSS en `<html>` para
 * que cards, hero y demás superficies reaccionen a la MISMA luz, textura y
 * "pulso" que ve la escena — no a un brillo CSS inventado aparte.
 */
export interface SceneAmbient {
  /** Ángulo (grados, convención de `linear-gradient` CSS) de la luz clave proyectada en pantalla. */
  lightAngleDeg: number
  /** 0 = frío (verde), 1 = cálido (naranja) — mismo lenguaje que `keyLight`/`fillLight`. */
  warmth: number
  /** 0..1, brillo/bloom general de la escena en este momento. */
  intensity: number
  /** 0..1, pulso transitorio (llegada a una sección nueva). Decae solo. */
  kick: number
  /** 0..1, progreso de la coreografía de apertura inicial. */
  intro: number
}

const DEFAULT_AMBIENT: SceneAmbient = {
  lightAngleDeg: 135,
  warmth: 0.5,
  intensity: 0.55,
  kick: 0,
  intro: 1,
}

type Listener = () => void
type AmbientListener = (ambient: SceneAmbient) => void

class WebGLSceneBus {
  private focus: SceneFocus = { sectionId: null, progress: 0 }
  private pointerIntent = 0
  private entityAtmosphere: EntityAtmosphere | null = null
  private listeners = new Set<Listener>()
  private ambient: SceneAmbient = DEFAULT_AMBIENT
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
    const clamped = Math.min(Math.max(progress, 0), 1)
    if (this.focus.sectionId === sectionId && this.focus.progress === clamped) return
    this.focus = { sectionId, progress: clamped }
    this.emit()
  }

  /** Publicado por elementos interactivos (cards, CTAs) al recibir hover/focus real. */
  setPointerIntent(value: number) {
    const clamped = Math.min(Math.max(value, 0), 1)
    if (this.pointerIntent === clamped) return
    this.pointerIntent = clamped
    this.emit()
  }

  /**
   * Publicado por `EntityAtmosphereBridge` al montar/desmontar una ficha de
   * entidad. `null` limpia la atmósfera (vuelve al comportamiento de home).
   */
  setEntityAtmosphere(value: EntityAtmosphere | null) {
    const prev = this.entityAtmosphere
    const same =
      prev === value ||
      (prev !== null &&
        value !== null &&
        prev.category === value.category &&
        prev.status === value.status &&
        prev.featured === value.featured)
    if (same) return
    this.entityAtmosphere = value
    this.emit()
  }

  getSnapshot() {
    return {
      focus: this.focus,
      pointerIntent: this.pointerIntent,
      entityAtmosphere: this.entityAtmosphere,
    }
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
    this.ambient = value
    this.ambientListeners.forEach((listener) => listener(value))
  }

  getAmbient(): SceneAmbient {
    return this.ambient
  }
}

export const webglSceneBus = new WebGLSceneBus()
export type WebGLSceneSnapshot = ReturnType<WebGLSceneBus['getSnapshot']>
