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
  rumor: 'bg-auto-accent-warning/10 text-auto-accent-warning border border-auto-accent-warning/30',
  nuestro: 'bg-auto-accent-orange/10 text-auto-accent-orange border border-auto-accent-orange/30',
}

export function Badge({
  variant = 'default',
  status,
  children,
  className = '',
}: BadgeProps) {
  let style = 'bg-auto-surface-elevated/80 text-auto-text-secondary border border-auto-border'

  if (variant === 'status' && status) {
    style = statusStyles[status]
  } else if (variant === 'tag') {
    style = 'bg-auto-accent/15 text-auto-accent-strong border border-auto-accent/35'
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm ${style} ${className}`}
    >
      {children}
    </span>
  )
}
