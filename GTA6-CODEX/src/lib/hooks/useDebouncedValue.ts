'use client'

import { useEffect, useState } from 'react'

/**
 * Devuelve una versión "debounced" del valor recibido: solo se actualiza
 * después de que `delay` ms pasaron sin cambios en el valor de entrada.
 *
 * Útil para inputs de búsqueda: el input se actualiza al instante (buena UX),
 * pero el cálculo pesado (ej. Fuse.js) espera a que el usuario deje de tipear.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [value, delay])

  return debouncedValue
}
