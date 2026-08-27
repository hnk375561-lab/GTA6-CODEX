/**
 * Capítulo 5 — Snap y ritmo narrativo (ver biblia-scroll-rockstar.txt).
 * ---------------------------------------------------------------------------
 * Helpers puros para el "snap de captura corta": cuando el scroll pasa cerca
 * de un límite entre bloques grandes (ej. hero → categorías), lo completa
 * suavemente hasta el borde exacto en vez de dejarlo a mitad de camino.
 *
 * Deliberadamente NO es `scroll-snap-type` de CSS. Lenis corre en modo
 * "estándar" (ver `lenis-provider.tsx`, punto 1): sigue moviendo el scroll
 * real del documento vía rAF con su propia inercia. Un `scroll-snap-type`
 * nativo pelearía contra esa inercia (el navegador intentando enganchar
 * mientras Lenis todavía está interpolando) y produciría el "tirón" que
 * 5.2 pide evitar. En cambio, esto observa la posición real y, solo cuando
 * hace falta, le pide a la MISMA instancia de Lenis (`lenis.scrollTo`) que
 * termine el recorrido — un motor de scroll, nunca dos compitiendo.
 *
 * 5.1 — Dónde se permite enganchar
 * Esta captura es angosta a propósito (`SNAP_CAPTURE_ZONE_PX`, no la altura
 * de una sección entera) y se monta por `targetSelector` explícito, sección
 * por sección — nunca global. Eso es lo que garantiza el "nunca en
 * contenido largo" del punto 5.1: `ScrollSnapCatch` (ver
 * `useScrollSnapCatch.ts`) simplemente no se monta en `/[entityType]`,
 * `/[entityType]/[slug]` ni `/buscar`. No hace falta una lista de
 * exclusión — la inclusión es opt-in por página.
 *
 * 5.2 — Duración de la animación de acomodo
 * `computeSnapCatchDuration` traduce velocidad de entrada (0..1, mismo
 * lenguaje normalizado que `--scroll-speed` de Capítulo 4) a duración de la
 * corrección: veloz = corrección corta (el usuario "ya estaba en el aire",
 * el snap solo ajusta un poco), lento = corrección más larga (hay más
 * distancia real por recorrer, una corrección brusca ahí sí se sentiría
 * como tirón). Es una curva de sensación, no física exacta de distancia —
 * mapea al mismo lenguaje relativo (0..1) que ya usa Capítulo 4 en vez de
 * inventar una escala nueva.
 */

/** Media zona (px) a cada lado del borde donde el snap puede engancharse. */
export const SNAP_CAPTURE_ZONE_PX = 120

/**
 * Distancia (px) que hay que alejarse del borde para "rearmar" la captura.
 * Mayor que `SNAP_CAPTURE_ZONE_PX` a propósito (histéresis): evita que el
 * propio `scrollTo` programático, que termina exactamete en el borde,
 * dispare una segunda captura inmediata sobre sí mismo.
 */
export const SNAP_REARM_ZONE_PX = 320

/** Duración (s) de la corrección cuando el usuario venía scrolleando rápido. */
export const SNAP_DURATION_FAST = 0.32

/** Duración (s) de la corrección cuando el usuario venía scrolleando lento (o ya casi detenido). */
export const SNAP_DURATION_SLOW = 0.85

/**
 * Easing de la corrección: ease-out cúbico, deliberadamente más corto y
 * decisivo que la desaceleración exponencial "pesada" que usa Lenis para el
 * scroll normal (`lenis-provider.tsx`). Esto no es inercia de página, es un
 * acomodo puntual — debe sentirse "asentado" rápido (mismo espíritu que el
 * perfil de easing de texto en Capítulo 1.2: casi lineal al final, sin
 * flotar), no una desaceleración larga que compita con la de Lenis.
 */
export function snapCatchEasing(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * 0..1 → duración en segundos, interpolación lineal simple entre los dos
 * extremos declarados arriba. `speed01` fuera de rango se clampea, así un
 * caller que reenvíe `--scroll-speed` tal cual (que ya viene clampeado, pero
 * por las dudas) nunca produce una duración fuera de la curva esperada.
 */
export function computeSnapCatchDuration(speed01: number): number {
  const clamped = Math.max(0, Math.min(1, speed01))
  return SNAP_DURATION_SLOW - clamped * (SNAP_DURATION_SLOW - SNAP_DURATION_FAST)
}

/**
 * ¿La posición actual de scroll cae dentro de la zona de captura de un
 * borde? Centrada en `boundaryY`, simétrica (sirve para aproximarse desde
 * arriba o desde abajo — un usuario volviendo hacia el hero también recibe
 * el acomodo, no solo quien baja).
 */
export function isWithinCaptureZone(scrollY: number, boundaryY: number): boolean {
  return Math.abs(scrollY - boundaryY) <= SNAP_CAPTURE_ZONE_PX
}

/**
 * ¿Ya se alejó lo suficiente del borde como para rearmar la próxima
 * captura? Usa `SNAP_REARM_ZONE_PX` (más ancha que la zona de captura) para
 * la histéresis descrita arriba.
 */
export function isOutsideRearmZone(scrollY: number, boundaryY: number): boolean {
  return Math.abs(scrollY - boundaryY) > SNAP_REARM_ZONE_PX
}
