'use client'

import { ReactNode } from 'react'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function Card({ children, className = '', hoverable = false }: CardProps) {
  const hoverClass = hoverable
    ? 'hover:border-auto-accent/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300'
    : 'transition-colors duration-300'

  return (
    <div
      className={`
        rounded-2xl border border-edge bg-surface-card p-6 shadow-sm
        ${hoverClass}
        ${className}
      `}
      // Solo las cards realmente interactivas (`hoverable`) publican intención
      // de cursor al motor WebGL; el resto no cambia comportamiento.
      onMouseEnter={hoverable ? () => webglSceneBus.setPointerIntent(1) : undefined}
      onMouseLeave={hoverable ? () => webglSceneBus.setPointerIntent(0) : undefined}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`border-b border-edge pb-4 ${className}`}>{children}</div>
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`py-4 ${className}`}>{children}</div>
}

