'use client'

import { useSyncExternalStore } from 'react'

function subscribe(): () => void {
  return () => {}
}

function getSnapshot(): boolean {
  return true
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Reemplaza el patrón repetido `useState(false) + useEffect(() =>
 * setMounted(true), [])` que varios componentes usaban para saber si ya
 * están en el cliente (necesario antes de usar `createPortal`, que
 * necesita `document.body` y no existe en SSR). `useSyncExternalStore`
 * devuelve `false` en el render de servidor/primer render de cliente
 * (mismo valor en ambos, sin mismatch de hidratación) y `true` en
 * cualquier render posterior — sin pasar por un `useEffect` que dispare
 * un `setState` síncrono (lo que hacía el patrón viejo).
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
