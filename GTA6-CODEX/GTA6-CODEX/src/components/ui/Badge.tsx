import { InformationStatus } from '@/types'
import { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'status' | 'tag' | 'default'
  status?: InformationStatus
  children: ReactNode
  className?: string
}

const statusStyles: Record<InformationStatus, string> = {
  confirmado: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/25',
  rumor: 'bg-gta-accent-warning/10 text-gta-accent-warning border border-gta-accent-warning/30',
  nuestro: 'bg-gta-accent-orange/10 text-gta-accent-orange border border-gta-accent-orange/30',
}

export function Badge({
  variant = 'default',
  status,
  children,
  className = '',
}: BadgeProps) {
  let style = 'bg-gta-surface-elevated/80 text-gta-text-secondary border border-gta-border'

  if (variant === 'status' && status) {
    style = statusStyles[status]
  } else if (variant === 'tag') {
    style = 'bg-gta-accent/15 text-gta-accent-strong border border-gta-accent/35'
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm ${style} ${className}`}
    >
      {children}
    </span>
  )
}
