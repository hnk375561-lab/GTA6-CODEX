/**
 * Separado de `scroll-telemetry.tsx` durante la limpieza del motor
 * WebGL/choreo (ver `docs/spike-4-1-motor-webgl-choreo-2026-09.md`): ese
 * archivo orquestaba la publicación de velocidad/progreso de scroll en
 * `webglSceneBus` (infraestructura heredada, eliminada) mientras que
 * `smoothScrollTo` es la utilidad con uso real hoy, consumida por
 * `ScrollRestorationBridge` (y referenciada por `PageTransitionBridge`)
 * — así que se conserva tal cual en un módulo propio.
 *
 * Scrollea a un elemento o posición. Antes delegaba en Lenis
 * (`window.__lenis.scrollTo`) para que el gesto tuviera la misma inercia
 * "pesada" que el resto del scroll; con el sitio ya estático no hay
 * segundo motor que igualar, así que esto es scroll nativo del navegador
 * (`scrollIntoView`/`scrollTo` con `behavior: 'smooth'`) — un salto puntual
 * y acotado, disparado explícitamente por una acción de la persona (click
 * en el botón de "seguir scrolleando", restauración de posición al volver
 * atrás), no un movimiento ambiental de la página. Se sigue centralizando
 * acá para que no convivan dos formas distintas de saltar a una posición.
 */
export function smoothScrollTo(
  target: HTMLElement | number | string,
  options?: { offset?: number }
) {
  if (typeof target === 'number') {
    window.scrollTo({ top: target + (options?.offset ?? 0), behavior: 'smooth' })
    return
  }

  const el =
    typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) return

  if (options?.offset) {
    const top = el.getBoundingClientRect().top + window.scrollY + options.offset
    window.scrollTo({ top, behavior: 'smooth' })
    return
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}