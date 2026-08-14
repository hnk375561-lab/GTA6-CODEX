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

type Listener = () => void

class WebGLSceneBus {
  private focus: SceneFocus = { sectionId: null, progress: 0 }
  private pointerIntent = 0
  private listeners = new Set<Listener>()

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

  getSnapshot() {
    return {
      focus: this.focus,
      pointerIntent: this.pointerIntent,
    }
  }
}

export const webglSceneBus = new WebGLSceneBus()
export type WebGLSceneSnapshot = ReturnType<WebGLSceneBus['getSnapshot']>
