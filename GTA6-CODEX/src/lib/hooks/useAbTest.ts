'use client'

import { useEffect, useState } from 'react'
import { trackAbAssignment } from '@/lib/analytics-events'

const STORAGE_PREFIX = 'autoficha:ab:'

/**
 * Hash determinístico simple (djb2) — no necesita ser criptográfico, solo
 * repartir visitantes entre variantes de forma estable por sesión/dispositivo
 * antes de que exista un valor persistido en localStorage.
 */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return Math.abs(hash)
}

/**
 * Elige una variante de forma determinística en base a un seed (ej. un id
 * random generado una vez y persistido). Separado del hook para poder
 * testearlo sin DOM/localStorage — es una función pura.
 */
export function pickVariant<T extends string>(seed: string, variants: readonly T[]): T {
  if (variants.length === 0) {
    throw new Error('pickVariant: se necesita al menos una variante')
  }
  const index = hashString(seed) % variants.length
  return variants[index]
}

function readAssignment(testId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + testId)
  } catch {
    // localStorage deshabilitado (modo privado) o cuota excedida: el test
    // simplemente no persiste, cada visita puede caer en otra variante.
    return null
  }
}

function writeAssignment(testId: string, variant: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + testId, variant)
  } catch {
    // Falla en silencio — ver comentario en readAssignment.
  }
}

/**
 * A/B testing 100% cliente, sin backend ni feature-flag service (no existen
 * cuentas de usuario en el sitio — ver useWishlist.ts para el mismo criterio
 * aplicado a favoritos). La variante se sortea una vez por navegador con
 * `crypto.randomUUID()` como seed, se persiste en localStorage para que el
 * mismo visitante siempre vea la misma variante, y se reporta a GA4 al
 * montar el componente (evento `ab_test_assignment`) y opcionalmente en la
 * conversión (ver `trackAbConversion` en analytics-events.ts).
 *
 * Uso:
 *   const variant = useAbTest('olx-button-text', ['Ver en OLX', 'Buscar en OLX', 'Ver publicaciones'] as const)
 *   // variant === undefined en el primer render de servidor/cliente antes
 *   // de hidratar — quien lo use debe tener un fallback razonable (la
 *   // variante 0) hasta que hydrated pase a true, igual que useWishlist.
 */
export function useAbTest<T extends string>(testId: string, variants: readonly T[]): T {
  const [variant, setVariant] = useState<T>(variants[0])

  useEffect(() => {
    const existing = readAssignment(testId)
    let resolved: T

    if (existing && (variants as readonly string[]).includes(existing)) {
      resolved = existing as T
    } else {
      const seed =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${testId}-${Date.now()}-${Math.random()}`
      resolved = pickVariant(seed, variants)
      writeAssignment(testId, resolved)
    }

    setVariant(resolved)
    trackAbAssignment({ testId, variant: resolved })
    // Solo se corre una vez al montar: el testId y la lista de variantes
    // son estáticos en cada call site, no hace falta re-sortear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  return variant
}
