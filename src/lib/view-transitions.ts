'use client'

/**
 * EXPERIMENTAL — transición FLIP del vehículo del hero (home) hacia su
 * card en `/categorias/[grupo]` (ver `HeroVehicleShowcase.tsx` y
 * `EntityCard.tsx`). Marcado explícitamente como experimental por
 * decisión del usuario: alta complejidad (shared-element transition
 * *entre rutas* de Next.js App Router, no dentro de un mismo árbol de
 * componentes), sin comprometerse a un sprint fijo.
 *
 * Mecanismo: la View Transitions API nativa del navegador
 * (`document.startViewTransition`) — sin librería externa a propósito,
 * para no sumar una dependencia nueva por un experimento de alcance
 * acotado a un solo recorrido (hero → card de categoría). El navegador
 * empareja automáticamente los elementos que comparten el mismo
 * `view-transition-name` entre el snapshot "antes" (home) y "después"
 * (categoría) y anima la transformación (posición/tamaño/opacidad) sin
 * que el sitio tenga que calcular ningún FLIP a mano.
 *
 * Limitaciones conocidas y aceptadas (no son bugs, son el alcance real
 * del experimento):
 * - Soporte de navegador: Chrome/Edge (Chromium) y Safari 18+. Sin
 *   soporte (hoy: Firefox), `supportsViewTransitions()` devuelve false
 *   y todo el mecanismo queda inerte — el click navega normal, sin
 *   ninguna animación ni error.
 * - Next.js App Router no expone un callback de "ya terminé de pintar
 *   la ruta nueva" para coordinar con `startViewTransition`. Se usa un
 *   doble `requestAnimationFrame` como heurística (patrón común en la
 *   comunidad para este mismo problema) — en conexiones lentas la
 *   animación puede arrancar un poco antes de que el contenido nuevo
 *   esté 100% asentado.
 * - `sessionStorage` es el canal para decirle a la página de destino
 *   "este es el vehículo que vino animándose desde el hero" (ver
 *   `consumeFlipSlug`), con un TTL corto para que un click viejo no
 *   dispare una animación inesperada en una visita futura no
 *   relacionada.
 */

const FLIP_STORAGE_KEY = 'sinfrenos:flip-vehicle'
const FLIP_TTL_MS = 4000

/** Nombre compartido entre la imagen actual del hero y la card de
 *  destino — solo puede existir UNA vez por snapshot del documento, por
 *  eso `EntityCard` únicamente lo asigna a la card cuyo slug matchea
 *  (ver `consumeFlipSlug`) y nunca a las demás cards de la grilla. */
export const FLIP_VIEW_TRANSITION_NAME = 'flip-vehicle-image'

type NavigateFn = (href: string) => void

/** true solo si el navegador soporta la View Transition API nativa. El
 *  caller es responsable de respetar además `prefers-reduced-motion`
 *  (ver `reducedMotion` en `HeroVehicleShowcase`) — esta función no lo
 *  chequea por su cuenta para no duplicar ese estado acá. */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
}

/**
 * Dispara la navegación hacia `href` marcando `slug` como el vehículo
 * que debe "continuar" visualmente en destino. Sin soporte de View
 * Transitions, es un `navigate(href)` normal sin ningún efecto extra.
 */
export function navigateWithFlip(navigate: NavigateFn, href: string, slug: string) {
  if (!supportsViewTransitions()) {
    navigate(href)
    return
  }

  try {
    sessionStorage.setItem(FLIP_STORAGE_KEY, JSON.stringify({ slug, ts: Date.now() }))
  } catch {
    // sessionStorage puede fallar (modo privado estricto, cuota llena) —
    // el click igual navega más abajo, simplemente sin la animación FLIP
    // en destino (la card no va a encontrar nada que consumir).
  }

  document.startViewTransition(() => {
    return new Promise<void>((resolve) => {
      navigate(href)
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
  })
}

/**
 * Lee (y consume) el slug marcado por `navigateWithFlip` si coincide con
 * `slug`. Si NO coincide, deja el valor intacto en `sessionStorage` para
 * que otra card de la misma grilla (la que sí matchea) todavía pueda
 * consumirlo — solo se borra cuando matchea o cuando quedó viejo
 * (`FLIP_TTL_MS`), nunca en el primer intento fallido.
 */
export function consumeFlipSlug(slug: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(FLIP_STORAGE_KEY)
    if (!raw) return false

    const parsed = JSON.parse(raw) as { slug?: string; ts?: number }
    const stale = typeof parsed.ts !== 'number' || Date.now() - parsed.ts > FLIP_TTL_MS

    if (stale) {
      sessionStorage.removeItem(FLIP_STORAGE_KEY)
      return false
    }

    if (parsed.slug === slug) {
      sessionStorage.removeItem(FLIP_STORAGE_KEY)
      return true
    }

    return false
  } catch {
    return false
  }
}
