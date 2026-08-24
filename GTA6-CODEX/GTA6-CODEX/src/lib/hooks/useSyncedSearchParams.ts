'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Sincroniza filtros de UI (búsqueda, orden, tags, etc.) con los query
 * params de la URL actual, así el estado filtrado queda:
 *
 *  - Compartible: copiar el link reproduce exactamente los mismos filtros
 *    para quien lo abra (se leen una sola vez al montar, vía
 *    `searchParams.get(...)` en el `useState` inicial de cada caller).
 *  - Preservado en el botón "atrás": al navegar a una ficha y volver, el
 *    navegador restaura la URL anterior con los filtros ya aplicados, en
 *    vez de resetear la lista.
 *
 * Usa `router.replace` (no `push`) para no generar una entrada de
 * historial por cada tecla tipeada o cada chip tocado — el historial
 * sigue teniendo una entrada por página visitada, no por cada ajuste de
 * filtro dentro de ella. `scroll: false` evita que cada actualización de
 * la URL salte el scroll al tope de la página.
 */
export function useSyncedSearchParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /**
   * Aplica un parche de query params sobre los actuales. Un valor
   * `null`, `undefined` o `''` elimina esa clave (así los filtros en su
   * valor "por defecto" no ensucian la URL con `?estado=todos` etc.).
   */
  const updateParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === '') {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return { searchParams, updateParams }
}
