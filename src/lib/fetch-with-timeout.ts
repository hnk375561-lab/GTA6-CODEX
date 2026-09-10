/**
 * fetch con timeout vía AbortController, para usar en componentes
 * 'use client'.
 *
 * Por qué hace falta: sin esto, un fetch a un servicio externo (Google
 * Forms, API propia) que nunca responde deja el componente "colgado" —
 * el estado de "Enviando…" no se resuelve nunca, y si el componente se
 * desmonta mientras el fetch sigue pendiente (usuario navega a otra
 * página), el fetch sigue vivo en memoria hasta que el navegador lo
 * corta por su cuenta.
 *
 * Uso típico dentro de un handler de submit:
 *
 *   try {
 *     const res = await fetchWithTimeout(url, { method: 'POST', ... })
 *   } catch (err) {
 *     if (isTimeoutError(err)) {
 *       // se cortó por timeout, no por error de red
 *     }
 *     // fallback (ej. mailto)
 *   }
 */

export const DEFAULT_FETCH_TIMEOUT_MS = 8_000

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: init.signal ?? controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export function isTimeoutError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
