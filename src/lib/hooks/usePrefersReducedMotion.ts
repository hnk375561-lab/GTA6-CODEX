'use client'

import { useSyncExternalStore } from 'react'
import { prefersReducedMotion } from '@/lib/utils'

/**
 * Reemplaza el patrón repetido `useState + useEffect(matchMedia)` que
 * existía suelto en varios componentes (Parallax, CompareShowcase,
 * QuickSearchForm, RankingsSpotlight). `useSyncExternalStore` es el hook
 * pensado exactamente para esto — sincronizar React con un valor externo
 * al DOM/navegador — y evita el lint error `react-hooks/set-state-in-effect`
 * sin perder el comportamiento: sigue devolviendo `false` en el render de
 * servidor/primer render de cliente (mismo valor, sin mismatch de
 * hidratación) y se actualiza en caliente cuando el usuario cambia la
 * preferencia del sistema mientras la página está abierta.
 */
function subscribe(callback: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return prefersReducedMotion()
}

function getServerSnapshot(): boolean {
  return false
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
