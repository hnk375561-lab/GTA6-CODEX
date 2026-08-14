'use client'

import { useEffect, useState } from 'react'

/**
 * Versión reactiva de prefersReducedMotion() (src/lib/utils.ts).
 * Útil en componentes que deciden en render qué animar: se suscribe
 * al media query y se actualiza si el usuario cambia la preferencia
 * del sistema sin recargar la página.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mql.matches)

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reduced
}
