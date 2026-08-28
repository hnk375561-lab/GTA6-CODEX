'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * La home (`/`) es un viewport pineado de 0-scroll-de-página: cada panel ya
 * ocupa el 100dvh completo, así que la TrendingBar y el Footer (pensados
 * para un layout de scroll normal, con `main` fluyendo debajo de ellos) no
 * tienen dónde vivir sin robarle alto real al panel pineado — y el usuario
 * nunca "llega" a ellos igual, porque ahí no hay scroll de documento.
 *
 * En vez de eliminarlos del árbol para siempre, se ocultan solo en home:
 * en el resto del sitio (fichas, listados, etc.) el layout sigue siendo el
 * de toda la vida y estos componentes se renderizan igual que antes.
 *
 * `children` puede ser un Server Component (p.ej. `<TrendingBar />`, que
 * hace fetch de datos) — Next.js lo resuelve en el servidor antes de
 * cruzar el límite hacia este Client Component, así que pasarlo acá no
 * cuesta JS de cliente extra ni rompe el patrón server/client.
 */
export function HideOnHome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <>{children}</>
}
