'use client'

/**
 * Bus de escena — el puente entre la UI real (secciones, hero, hover de
 * tarjetas, navegación, scroll) y el motor WebGL.
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
 *
 * Evolución de esta versión (mismo contrato público, capacidades ampliadas):
 *  - Los tres tipos originales (`SceneFocus`, `EntityAtmosphere`,
 *    `SceneAmbient`) mantienen su forma EXACTA. `engine.ts` y los hooks los
 *    construyen como literales en varios puntos (`{ category, status,
 *    featured }`, `publishAmbient({ lightAngleDeg, warmth, ... })`), así que
 *    agregarles un campo requerido nuevo rompería la integración existente.
 *    Toda ampliación real se agrega en tipos *extendidos* aparte, o como
 *    parámetros opcionales — nunca angostando ni modificando las formas base.
 *  - `setSectionFocus` ahora deriva sola, sin ningún caller nuevo, dos
 *    señales que antes vivían duplicadas dentro de `engine.ts`: la
 *    transición entre secciones (`SceneTransition`, con tiempo de estadía) y
 *    el estado del hero (`HeroState`). Como `SceneSection` ya llama a
 *    `setSectionFocus` para cada sección instrumentada (incluido el hero),
 *    estas señales quedan disponibles de inmediato.
 *  - `setPointerIntent` acepta ahora un segundo parámetro OPCIONAL
 *    (`PointerIntentSource`) para distinguir de qué tipo de superficie viene
 *    el hover. Las llamadas existentes (`setPointerIntent(1)`) siguen
 *    compilando y comportándose exactamente igual.
 *  - `publishAmbient` sigue aceptando exactamente `SceneAmbient` (los 5
 *    campos que ya calcula `engine.ts`), pero antes de reenviarlo a los
 *    suscriptores lo enriquece con `SceneAmbientSignals`: matiz, densidad de
 *    partícula, profundidad y saturación sugeridas, derivadas de los mismos
 *    5 números — sin que el motor tenga que calcularlas ni saber que
 *    existen. `SceneAmbientBridge` (sin cambios) sigue leyendo solo los 5
 *    campos que ya conoce; un bridge futuro puede leer el resto.
 *  - Se agregan dos canales nuevos, listos pero inertes hasta que un futuro
 *    componente los llame: `setScrollProgress` (scroll global de página,
 *    distinto del progreso por sección que ya cubre `SceneFocus`) y
 *    `setNavigationTransition` (cambio de ruta). No los llama nadie todavía
 *    — no reemplazan nada existente — pero completan el contrato pedido
 *    (navegación, scroll) con la misma disciplina de tipado y limpieza que
 *    el resto del bus.
 *  - Arquitectura: helpers puros (`clamp01`, `finiteOr`, `sameEntityAtmosphere`,
 *    `samePointerSource`, `deriveAmbientSignals`) sacados de los métodos de la clase para que
 *    cada setter sea una función chica y testeable, y para blindar el
 *    puente contra NaN/Infinity antes de que lleguen a una variable CSS o a
 *    un uniform de shader. Los snapshots (`getSnapshot`, `getAmbient`) se
 *    devuelven congelados (`Object.freeze`) — nadie río abajo puede mutar
 *    estado del bus por accidente.
 */

// ---------------------------------------------------------------------------
// Tipos base (forma exacta preservada — ver nota arriba)
// ---------------------------------------------------------------------------

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
 * `AutoFichaWebGLEngine` en su loop de render y consumido por
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

// ---------------------------------------------------------------------------
// Tipos nuevos — puramente aditivos, no angostan ninguna forma existente.
// ---------------------------------------------------------------------------

/**
 * De qué tipo de superficie viene una intención de hover/puntero. Permite a
 * futuros consumidores reaccionar distinto ante un hover de card que ante
 * uno de CTA o de navegación, sin que `setPointerIntent` deje de aceptar la
 * forma simple (`setPointerIntent(1)`) que ya usan `Card.tsx`/`MagicCard.tsx`.
 */
export interface PointerIntentSource {
  kind: 'card' | 'cta' | 'nav' | 'media' | 'custom'
  /** Id opcional del elemento, para depuración o reacciones por-entidad. */
  id?: string
}

/**
 * Describe el cambio de foco más reciente entre secciones: de dónde venía,
 * a dónde va, y cuánto tiempo estuvo activa la sección anterior. Se calcula
 * solo dentro de `setSectionFocus` — ningún caller nuevo tiene que
 * instrumentarse para que exista, porque `SceneSection` ya llama a
 * `setSectionFocus` para cada sección real.
 */
export interface SceneTransition {
  fromSectionId: string | null
  toSectionId: string
  /** `performance.now()` (ms) del instante del cambio. */
  at: number
  /** Cuánto tiempo (ms) estuvo activa `fromSectionId` antes de este cambio. */
  dwellMs: number
}

/**
 * Progreso de scroll normalizado de la página completa (0..1) + velocidad y
 * dirección instantáneas. Es una señal complementaria a `SceneFocus`, que es
 * *por sección*: esta es la posición global, útil para efectos que no
 * dependen de qué sección puntual está en pantalla (ej. una niebla que solo
 * se despeja cerca del final de la página). Canal listo para un futuro hook
 * de layout; hoy ningún archivo lo publica todavía.
 */
export interface ScrollTelemetry {
  progress: number
  velocity: number
  direction: -1 | 0 | 1
}

/**
 * Transición de navegación (cambio de ruta). Pensado para engancharse a
 * eventos de router (ej. `usePathname` de Next.js) en un futuro bridge
 * análogo a `SceneAmbientBridge`, y así permitirle al motor reaccionar a un
 * cambio de página completo (ej. un fundido) en vez de solo a scroll dentro
 * de la misma. Canal listo, hoy ningún archivo lo publica todavía.
 */
export interface NavigationTransition {
  pending: boolean
  pathname: string | null
}

/**
 * Estado del hero derivado automáticamente de `setSectionFocus` — no
 * requiere ningún caller nuevo. `active` refleja si el hero es ahora mismo
 * la sección dominante; `hasLeftHero` se pone en `true` la primera vez que
 * el usuario se aleja y nunca vuelve a `false` (útil para efectos de
 * "primera impresión" que solo deben dispararse una vez por sesión).
 */
export interface HeroState {
  active: boolean
  hasLeftHero: boolean
}

/**
 * Lo que realmente reciben los suscriptores de `subscribeAmbient`: superset
 * de `SceneAmbient` con señales derivadas para atmósfera/color/profundidad
 * de partículas, calculadas a partir de los mismos 5 números que ya publica
 * `engine.ts`. Todo consumidor que solo conoce los 5 campos originales
 * sigue funcionando sin cambios (`SceneAmbientBridge` no se modifica); los
 * nuevos quedan disponibles para bridges futuros.
 */
export interface SceneAmbientSignals extends SceneAmbient {
  /** Desvío de matiz sugerido en grados (-30..30), derivado de `warmth`. */
  hueShiftDeg: number
  /** Densidad sugerida de partícula/polvo en el DOM (0..~1.4), derivada de `intensity` + `kick`. */
  particleDensity: number
  /** Profundidad/desenfoque sugeridos para capas parallax del DOM (0..1), derivado de `intro` + `kick`. */
  depth: number
  /** Saturación sugerida (0..1), derivada de `warmth` + `intensity`. */
  saturation: number
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
const DEFAULT_NAVIGATION: NavigationTransition = { pending: false, pathname: null }
const DEFAULT_HERO: HeroState = { active: false, hasLeftHero: false }

/** Id de la sección hero — mismo valor que usa `SECTION_MOOD.hero` en `engine.ts`. */
const HERO_SECTION_ID = 'hero'
/** Progreso mínimo para considerar al hero "activo" — coincide con el umbral que ya usa `engine.ts` para adoptar el mood de una sección. */
const HERO_ACTIVE_THRESHOLD = 0.35

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

/** Devuelve `value` si es un número finito, o `fallback` si llega NaN/Infinity (defensa ante bugs futuros del lado del motor, antes de que el dato llegue a una CSS var o a un uniform). */
const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

function sameEntityAtmosphere(a: EntityAtmosphere | null, b: EntityAtmosphere | null): boolean {
  if (a === b) return true
  return a !== null && b !== null && a.category === b.category && a.status === b.status && a.featured === b.featured
}

function samePointerSource(a: PointerIntentSource | null, b: PointerIntentSource | null): boolean {
  if (a === b) return true
  return a !== null && b !== null && a.kind === b.kind && a.id === b.id
}

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
  private pointerSource: PointerIntentSource | null = null
  private entityAtmosphere: EntityAtmosphere | null = null
  private transition: SceneTransition | null = null
  private scroll: ScrollTelemetry = DEFAULT_SCROLL
  private navigation: NavigationTransition = DEFAULT_NAVIGATION
  private hero: HeroState = DEFAULT_HERO
  /** Instante en que la sección actual pasó a ser la activa — usado para calcular `dwellMs`. */
  private focusEnteredAt = 0

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

  /**
   * Publicado por `useSectionSceneFocus` en cada sección instrumentada.
   * Además de actualizar el foco, deriva sola dos señales adicionales sin
   * requerir ningún caller nuevo:
   *  - `SceneTransition`: de qué sección se vino y cuánto duró.
   *  - `HeroState`: si el hero está activo, y si el usuario ya lo abandonó
   *    alguna vez en esta sesión.
   */
  setSectionFocus(sectionId: string | null, progress: number) {
    const clamped = clamp01(finiteOr(progress, this.focus.progress))
    if (this.focus.sectionId === sectionId && this.focus.progress === clamped) return

    if (sectionId !== null && sectionId !== this.focus.sectionId) {
      const at = now()
      this.transition = {
        fromSectionId: this.focus.sectionId,
        toSectionId: sectionId,
        at,
        dwellMs: this.focusEnteredAt ? at - this.focusEnteredAt : 0,
      }
      this.focusEnteredAt = at
      if (this.focus.sectionId === HERO_SECTION_ID) {
        this.hero = { active: false, hasLeftHero: true }
      }
    }

    if (sectionId === HERO_SECTION_ID) {
      this.hero = { active: clamped > HERO_ACTIVE_THRESHOLD, hasLeftHero: this.hero.hasLeftHero }
    } else if (this.hero.active) {
      this.hero = { active: false, hasLeftHero: this.hero.hasLeftHero }
    }

    this.focus = { sectionId, progress: clamped }
    this.emit()
  }

  /**
   * Publicado por elementos interactivos (cards, CTAs) al recibir
   * hover/focus real. `source` es opcional — distingue de qué tipo de
   * superficie viene la intención para reacciones futuras más finas, sin
   * afectar a los callers existentes que solo pasan el número.
   */
  setPointerIntent(value: number, source: PointerIntentSource | null = null) {
    const clamped = clamp01(finiteOr(value, this.pointerIntent))
    if (this.pointerIntent === clamped && samePointerSource(this.pointerSource, source)) return
    this.pointerIntent = clamped
    this.pointerSource = source
    this.emit()
  }

  /**
   * Publicado por `EntityAtmosphereBridge` al montar/desmontar una ficha de
   * entidad. `null` limpia la atmósfera (vuelve al comportamiento de home).
   */
  setEntityAtmosphere(value: EntityAtmosphere | null) {
    if (sameEntityAtmosphere(this.entityAtmosphere, value)) return
    this.entityAtmosphere = value
    this.emit()
  }

  /**
   * Scroll global de página (0..1), distinto del progreso por-sección que ya
   * cubre `SceneFocus`. Canal nuevo, listo para un futuro hook de layout —
   * hoy ningún archivo lo publica todavía, pero queda disponible con la
   * misma disciplina (clamp, saneo de NaN, chequeo de igualdad) que el resto
   * del bus para cuando se conecte.
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

  /**
   * Cambio de ruta (navegación completa, no scroll dentro de la misma
   * página). Canal nuevo, listo para un futuro bridge de router — hoy
   * ningún archivo lo publica todavía.
   */
  setNavigationTransition(pending: boolean, pathname: string | null = this.navigation.pathname) {
    if (this.navigation.pending === pending && this.navigation.pathname === pathname) return
    this.navigation = { pending, pathname }
    this.emit()
  }

  /** Snapshot congelado: nadie río abajo puede mutar el estado del bus por accidente. */
  getSnapshot() {
    return Object.freeze({
      focus: this.focus,
      pointerIntent: this.pointerIntent,
      pointerSource: this.pointerSource,
      entityAtmosphere: this.entityAtmosphere,
      transition: this.transition,
      scroll: this.scroll,
      navigation: this.navigation,
      hero: this.hero,
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
   *
   * Sigue aceptando exactamente `SceneAmbient` (los 5 campos que ya calcula
   * `engine.ts`); antes de reenviarlo, lo enriquece con las señales
   * derivadas de `SceneAmbientSignals` y sanea cualquier NaN/Infinity.
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
   * aislados o HMR agresivo, donde se necesita garantizar cero fugas entre
   * corridas sin depender de que cada suscriptor haya llamado a su función
   * de limpieza.
   */
  reset() {
    this.focus = { sectionId: null, progress: 0 }
    this.pointerIntent = 0
    this.pointerSource = null
    this.entityAtmosphere = null
    this.transition = null
    this.scroll = DEFAULT_SCROLL
    this.navigation = DEFAULT_NAVIGATION
    this.hero = DEFAULT_HERO
    this.focusEnteredAt = 0
    this.ambient = deriveAmbientSignals(DEFAULT_AMBIENT)
    this.listeners.clear()
    this.ambientListeners.clear()
  }
}

export const webglSceneBus = new WebGLSceneBus()
export type WebGLSceneSnapshot = ReturnType<WebGLSceneBus['getSnapshot']>
