'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { smoothScrollTo } from '@/lib/scroll/scroll-telemetry'

/**
 * Capítulo 8.3 — scroll restoration al volver atrás (ver
 * biblia-scroll-rockstar.txt). Hoy el botón "atrás" del navegador salta de
 * golpe a la posición vieja; esto la restaura con un scroll nativo suave
 * (`smoothScrollTo`, ver `scroll-telemetry.tsx`) en vez de dejar que el
 * navegador la restaure en seco.
 *
 * Por qué `history.scrollRestoration = 'manual'`
 * Por defecto ('auto'), el navegador guarda y restaura la posición de
 * scroll de cada entrada de historial por su cuenta — incluso en
 * navegación cliente-a-cliente de Next.js (App Router), no solo en
 * recargas completas. Esa restauración es instantánea y ocurre ANTES de
 * que este componente pueda reaccionar. Poniendo el modo en 'manual' le
 * decimos al navegador "no restaures vos, yo me encargo" — el resto de
 * este archivo es esa restauración manual.
 *
 * Cómo se guarda la posición
 * Un solo listener de `scroll` en `window` (rAF-throttled), montado acá en
 * layout.tsx igual que `ScrollTelemetryProvider`/`PageTransitionBridge` —
 * nunca se desmonta al navegar. Cada tick guarda `window.scrollY` en
 * `sessionStorage`, bajo una clave por ruta (`pathname + search`). Se lee
 * `window.scrollY` directo: el sitio usa scroll 100% nativo (sin motor de
 * scroll propio), así que la posición real del documento es, siempre, la
 * fuente de verdad.
 *
 * Cómo se restaura
 * `usePathname()` cambia recién cuando Next ya montó el `children` nuevo
 * (mismo patrón que `PageTransitionBridge`). Si ese cambio vino de un
 * `popstate` (atrás/adelante del navegador — el único caso que
 * `PageTransitionBridge` deja fuera de alcance a propósito, ver su
 * comentario de "fuera de alcance"), se restaura la posición guardada para
 * la ruta nueva con `smoothScrollTo`. Si vino de una navegación hacia
 * adelante (click normal), no se toca nada — Next ya scrollea al tope por
 * su cuenta y `PageTransitionBridge` ya tapa ese salto con el fundido.
 *
 * `smoothScrollTo` ya degrada solo a un salto instantáneo si
 * `prefers-reduced-motion: reduce` (ver `scroll-telemetry.tsx`), así que no
 * hace falta duplicar esa lógica acá.
 */
const STORAGE_PREFIX = 'af-scroll:'
const MAX_STORED_ENTRIES = 40

function routeKey(pathname: string): string {
  return `${STORAGE_PREFIX}${pathname}${window.location.search}`
}

function readStoredPosition(key: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function writeStoredPosition(key: string, value: number) {
  try {
    window.sessionStorage.setItem(key, String(value))
  } catch {
    // sessionStorage lleno o bloqueado (modo privado estricto en algún
    // navegador): perder la restauración de esta ruta no es crítico, el
    // navegador simplemente queda arriba del todo como fallback.
  }
}

/** Evita que `sessionStorage` crezca sin límite en sesiones de navegación
 *  muy largas con muchas rutas distintas visitadas. No es una LRU real
 *  (no vale la complejidad acá) — cuando se pasa el límite, se descarta
 *  todo el set y se vuelve a construir desde cero. */
function pruneIfNeeded() {
  try {
    const ownKeys = Object.keys(window.sessionStorage).filter((k) =>
      k.startsWith(STORAGE_PREFIX)
    )
    if (ownKeys.length > MAX_STORED_ENTRIES) {
      ownKeys.forEach((k) => window.sessionStorage.removeItem(k))
    }
  } catch {
    // no-op — ver writeStoredPosition
  }
}

export function ScrollRestorationBridge() {
  const pathname = usePathname()
  const previousPathnameRef = useRef(pathname)
  const isPopNavigationRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  // Desactiva la restauración automática del navegador una sola vez.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('scrollRestoration' in window.history)) return
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  // Marca cuándo el cambio de ruta viene de atrás/adelante del navegador
  // (único caso donde corresponde restaurar) en vez de un click normal.
  useEffect(() => {
    const handlePopState = () => {
      isPopNavigationRef.current = true
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Guarda la posición de scroll de la ruta actual continuamente, no solo
  // al salir — así una pestaña cerrada/recargada a mitad de scroll todavía
  // tiene la última posición conocida guardada.
  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        writeStoredPosition(routeKey(window.location.pathname), window.scrollY)
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // La restauración en sí, disparada cuando `children` ya cambió.
  useEffect(() => {
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname

    const wasPopNavigation = isPopNavigationRef.current
    isPopNavigationRef.current = false

    if (!wasPopNavigation) return

    const saved = readStoredPosition(routeKey(pathname))
    if (saved === null) return

    // Un frame de margen: dejar que el layout del `children` nuevo termine
    // de asentarse (imágenes con alto reservado, fuentes ya cargadas)
    // antes de pedirle a Lenis que scrollee a una posición que todavía
    // podría no existir en el documento.
    const id = window.requestAnimationFrame(() => {
      smoothScrollTo(saved)
      pruneIfNeeded()
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])

  return null
}
