import { ReactNode } from 'react'
import { EntityType } from '@/types'

type CategoryIconProps = {
  type: EntityType
  className?: string
}

/**
 * Iconografía lineal propia para las categorías del zona.
 * Reemplaza los emojis (dependientes de la fuente del sistema operativo,
 * inconsistentes entre plataformas) por trazos SVG unificados: mismo
 * grosor de línea, mismos remates, mismo lenguaje visual "Leonida Nights".
 */
const PATHS: Partial<Record<EntityType, ReactNode>> = {
  [EntityType.VEHICLE]: (
    <>
      <path d="M4 16V12.5L6 7.5C6.3 6.7 7 6.2 7.9 6.2h8.2c.9 0 1.6.5 1.9 1.3l2 5v4" />
      <path d="M4 16h16M4 16a1.5 1.5 0 0 0 1.5 1.5H6A1.5 1.5 0 0 0 7.5 16M16.5 16a1.5 1.5 0 0 0 1.5 1.5h.5a1.5 1.5 0 0 0 1.5-1.5" />
      <circle cx="7" cy="16" r="1.4" />
      <circle cx="17" cy="16" r="1.4" />
    </>
  ),
  [EntityType.NEWS]: (
    <>
      <rect x="4" y="4.5" width="16" height="15" rx="1.4" />
      <path d="M7.5 8.5h6M7.5 11.5h9M7.5 14.5h9M7.5 17.5h5" />
    </>
  ),
  [EntityType.GUIDE]: (
    <>
      <path d="M4 5.2c1.6-.9 3.6-1.2 5.5-.7 1 .3 1.9.8 2.5 1.5v13c-.6-.7-1.5-1.2-2.5-1.5-1.9-.5-3.9-.2-5.5.7V5.2Z" />
      <path d="M20 5.2c-1.6-.9-3.6-1.2-5.5-.7-1 .3-1.9.8-2.5 1.5v13c.6-.7 1.5-1.2 2.5-1.5 1.9-.5 3.9-.2 5.5.7V5.2Z" />
    </>
  ),
}

export function CategoryIcon({ type, className }: CategoryIconProps) {
  const path = PATHS[type]
  if (!path) return null

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}
