import { InformationStatus } from '@/types'
import { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'status' | 'tag' | 'default'
  status?: InformationStatus
  children: ReactNode
  className?: string
}

/**
 * `Badge` es INFORMACIÓN, no un control: por eso su forma (`rounded-md`,
 * no cápsula) es deliberadamente distinta de los chips de filtro
 * interactivos (`rounded-full` + `aria-pressed`, ver EntityListExplorer/
 * GalleryExplorer/SearchClient). Antes ambos usaban `rounded-full` con
 * padding y tipografía casi idénticos — el badge de estado en una card
 * ("Confirmado") se veía pixel-igual al botón de filtro activo de esa
 * misma palabra en /vehiculos, sin ninguna señal de que uno se puede
 * tocar y el otro no. Ver auditoría de botones/badges/pills.
 */

const statusStyles: Record<InformationStatus, string> = {
  confirmado: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/25',
  rumor: 'bg-auto-accent-warning/10 text-auto-accent-warning border border-auto-accent-warning/30',
  nuestro: 'bg-auto-accent-orange/10 text-auto-accent-orange border border-auto-accent-orange/30',
}

export function Badge({
  variant = 'default',
  status,
  children,
  className = '',
}: BadgeProps) {
  let style = 'bg-surface-alt/80 text-neutral-500 border border-edge'

  if (variant === 'status' && status) {
    style = statusStyles[status]
  } else if (variant === 'tag') {
    style = 'bg-auto-accent/15 text-auto-accent-strong border border-auto-accent/35'
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm ${style} ${className}`}
    >
      {children}
    </span>
  )
}
