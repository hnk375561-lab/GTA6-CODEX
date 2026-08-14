import { InformationStatus } from '@/types'
import { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'status' | 'tag' | 'default'
  status?: InformationStatus
  children: ReactNode
  className?: string
}

const statusStyles: Record<InformationStatus, string> = {
  confirmado: 'bg-green-900/50 text-green-300 border border-green-800',
  rumor: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800',
  nuestro: 'bg-blue-900/50 text-blue-300 border border-blue-800',
}

export function Badge({
  variant = 'default',
  status,
  children,
  className = '',
}: BadgeProps) {
  let style = 'bg-gta-card text-gta-text-secondary border border-gta-border'

  if (variant === 'status' && status) {
    style = statusStyles[status]
  } else if (variant === 'tag') {
    style = 'bg-gta-accent/20 text-gta-accent border border-gta-accent/40'
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style} ${className}`}
    >
      {children}
    </span>
  )
}
