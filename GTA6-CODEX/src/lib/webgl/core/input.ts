/**
 * Input Event Handling Layer
 *
 * Pure functions for pointer and scroll input computation. These functions
 * extract the raw event data transformation logic without state management—
 * the engine retains ownership of `pointerTarget` and `scrollTarget` as
 * instance properties.
 *
 * Consumers in engine.ts wrap these to create event handlers:
 * ```typescript
 * private handlePointerMove = (e: PointerEvent) => {
 *   this.pointerTarget = computePointerTarget(e);
 * };
 *
 * private handleScroll = () => {
 *   this.scrollTarget = computeHeroScrollTarget();
 * };
 * ```
 */

/**
 * Compute normalized device coordinates for pointer position.
 *
 * Converts clientX/clientY (CSS pixels, origin at top-left of viewport)
 * to NDC (normalized device coordinates, range [-1, 1], origin at center).
 *
 * @param e PointerEvent from window 'pointermove'
 * @returns Normalized pointer position { x, y } ∈ [-1, 1]
 */
export function computePointerTarget(e: PointerEvent): { x: number; y: number } {
  return {
    x: (e.clientX / window.innerWidth) * 2 - 1,
    y: (e.clientY / window.innerHeight) * 2 - 1,
  }
}

/**
 * Compute normalized scroll progress.
 *
 * Returns a value in [0, 1] representing the document scroll position
 * relative to the maximum scrollable height. Returns 0 if document
 * is not scrollable (scrollHeight ≤ window.innerHeight).
 *
 * @returns Scroll progress: 0 at top, 1 at bottom, 0 if not scrollable
 * @deprecated El motor ya no usa esta variante para su `scrollProgress` de
 * escena (ver `computeHeroScrollTarget`): sobre una home con muchas
 * secciones, normalizar contra el alto TOTAL de la página diluye el
 * movimiento de cámara/parallax dentro del hero a una fracción mínima de
 * su rango real (con una página de N pantallas, el hero solo alcanza
 * ~1/N de progreso). Se mantiene exportada por si algún consumidor futuro
 * necesita el progreso de scroll global real (no relativo al hero).
 */
export function computeScrollTarget(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? window.scrollY / max : 0
}

/**
 * Alto del hero, en múltiplos de la altura de viewport, usado como rango
 * de normalización del scroll que consume el motor. Mismo valor que ya
 * usa `AutoFichaWebGLEngine.updatePausedState` para decidir cuándo el
 * fondo deja de ser relevante (~1.15 viewports: el hero real más un
 * margen para que la transición hacia la siguiente sección no se sienta
 * cortada) — compartido acá para que ambos puntos no puedan desincronizarse.
 */
export const HERO_SCROLL_RANGE_VH = 1.15

/**
 * Compute scroll progress normalizado al RANGO DEL HERO (no a la página
 * completa).
 *
 * El motor renderiza como fondo fijo de toda la home, pero su coreografía
 * de cámara/parallax/dispersión de capas (`scrollProgress` en
 * `engine.ts`) es, en la práctica, un efecto del hero: el propio motor se
 * pausa apenas se scrollea más allá de `HERO_SCROLL_RANGE_VH` viewports
 * (ver `updatePausedState`). Antes, ese `scrollProgress` se calculaba
 * contra el alto total del documento (`computeScrollTarget`): en una home
 * con varias pantallas de contenido debajo del hero, el usuario podía
 * scrollear el hero entero y el valor apenas se movía una fracción de su
 * rango 0..1 — el fondo "se movía", pero muy poco, mucho antes de llegar
 * a 1. Esta variante normaliza contra la altura real del hero, así que a
 * los `HERO_SCROLL_RANGE_VH` viewports de scroll el valor ya llegó a 1 y
 * toda la dispersión de cámara/capas que depende de él (dolly, FOV,
 * parallax de `farGroup`/`midGroup`, foco del bokeh) se despliega en su
 * rango completo dentro del propio hero, que es donde realmente se ve.
 *
 * @returns Scroll progress relativo al hero: 0 al tope de la página, 1 al
 * llegar (o pasar) `HERO_SCROLL_RANGE_VH` viewports de scroll.
 */
export function computeHeroScrollTarget(): number {
  const range = window.innerHeight * HERO_SCROLL_RANGE_VH
  if (range <= 0) return 0
  return Math.min(Math.max(window.scrollY / range, 0), 1)
}
