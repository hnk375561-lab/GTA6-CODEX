'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'sinfrenos:wishlist'
/** Evento custom disparado en el mismo tab tras cada mutación, para que
 *  todas las instancias del hook (ej. el botón en una card y el contador
 *  en el header, si algún día existe) se enteren sin depender solo del
 *  evento nativo `storage` — ese último SOLO dispara en tabs distintos al
 *  que hizo el cambio, nunca en el propio. */
const LOCAL_EVENT = 'sinfrenos:wishlist-change'

/** Id compuesto `type/slug` — mismo formato que ya usa `imageBySlug` en
 *  `getEntityImageMap` (ver `lib/media.ts`), así que reutilizamos la
 *  convención en vez de inventar una propia. */
export function wishlistId(type: string, slug: string): string {
  return `${type}/${slug}`
}

function readStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((v): v is string => typeof v === 'string'))
  } catch {
    // localStorage corrupto, deshabilitado (modo privado en algunos
    // navegadores) o cuota excedida: el sitio sigue funcionando, la
    // wishlist simplemente arranca vacía.
    return new Set()
  }
}

function writeStorage(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)))
    window.dispatchEvent(new Event(LOCAL_EVENT))
  } catch {
    // Cuota excedida o storage deshabilitado: falla en silencio, no rompe
    // la interacción del usuario (el toggle visual simplemente no persiste).
  }
}

/**
 * Wishlist/favoritos 100% cliente, persistida en `localStorage` — no hay
 * cuentas de usuario en el sitio, así que no hay backend donde guardar
 * esto (Fase Quick Wins, TODO.md "Wishlist / favoritos"). Funciona para
 * cualquier tipo de entidad (no solo vehículos): el id guardado es
 * `type/slug`, igual que el resto del código ya indexa imágenes/relaciones.
 *
 * Sincronizado entre pestañas (evento `storage`) y entre instancias del
 * hook en la misma pestaña (evento custom local), así un botón en una
 * card y, por ejemplo, un contador en el header, quedan siempre en el
 * mismo estado sin prop drilling.
 */
export function useWishlist() {
  // Arranca vacío en el server/primer render de cliente (SSR no tiene
  // localStorage) y se hidrata en el primer efecto — mismo patrón que
  // useEntityAtmosphere/reducedMotion en EntityCard para evitar mismatch
  // de hidratación.
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setIds(readStorage())
    setHydrated(true)

    const sync = () => setIds(readStorage())
    window.addEventListener('storage', sync)
    window.addEventListener(LOCAL_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(LOCAL_EVENT, sync)
    }
  }, [])

  const isWishlisted = useCallback((type: string, slug: string) => ids.has(wishlistId(type, slug)), [ids])

  const toggleWishlist = useCallback((type: string, slug: string) => {
    const id = wishlistId(type, slug)
    const next = readStorage()
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    writeStorage(next)
    setIds(next)
  }, [])

  const removeFromWishlist = useCallback((type: string, slug: string) => {
    const id = wishlistId(type, slug)
    const next = readStorage()
    next.delete(id)
    writeStorage(next)
    setIds(next)
  }, [])

  const clearWishlist = useCallback(() => {
    const empty = new Set<string>()
    writeStorage(empty)
    setIds(empty)
  }, [])

  return {
    /** true recién después del primer efecto en cliente — útil para no
     *  renderizar un conteo "0" que parpadea a otro valor apenas hidrata. */
    hydrated,
    ids,
    count: ids.size,
    isWishlisted,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
  }
}
