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
  [EntityType.CHARACTER]: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.8 4.3-5.8 7.5-5.8s6.1 2 7.5 5.8" />
    </>
  ),
  [EntityType.VEHICLE]: (
    <>
      <path d="M4 16V12.5L6 7.5C6.3 6.7 7 6.2 7.9 6.2h8.2c.9 0 1.6.5 1.9 1.3l2 5v4" />
      <path d="M4 16h16M4 16a1.5 1.5 0 0 0 1.5 1.5H6A1.5 1.5 0 0 0 7.5 16M16.5 16a1.5 1.5 0 0 0 1.5 1.5h.5a1.5 1.5 0 0 0 1.5-1.5" />
      <circle cx="7" cy="16" r="1.4" />
      <circle cx="17" cy="16" r="1.4" />
    </>
  ),
  [EntityType.LOCATION]: (
    <>
      <path d="M12 21c4-4.2 6.5-7.9 6.5-11A6.5 6.5 0 0 0 5.5 10c0 3.1 2.5 6.8 6.5 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
  [EntityType.TRAILER]: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
      <path d="M9.7 9.3v5.4l4.6-2.7-4.6-2.7Z" />
    </>
  ),
  [EntityType.MISSION]: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
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
  [EntityType.WEAPON]: (
    <>
      <path d="M3.5 14.5 13 5c.6-.6 1.6-.6 2.2 0l3.3 3.3c.6.6.6 1.6 0 2.2L9 20l-3.2-1.3L3.5 14.5Z" />
      <path d="M12.5 7.5l4 4M9.5 18.5l-4-4" />
    </>
  ),
  [EntityType.ACTIVITY]: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  [EntityType.FACTION]: (
    <>
      <path d="M12 3.5 19 6.5v5.2c0 5-3 8.7-7 9.8-4-1.1-7-4.8-7-9.8V6.5L12 3.5Z" />
      <path d="M8.7 12.3l2.3 2.3 4.3-4.6" />
    </>
  ),
  [EntityType.BUSINESS]: (
    <>
      <path d="M4 9.5 5.6 4.5h12.8L20 9.5" />
      <path d="M4.5 9.5v9.8h15V9.5" />
      <path d="M9.5 19.3v-5.6h5v5.6" />
    </>
  ),
  [EntityType.OBJECT]: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="1.6" />
      <path d="M5 9.5h14M9.5 5v14" />
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
