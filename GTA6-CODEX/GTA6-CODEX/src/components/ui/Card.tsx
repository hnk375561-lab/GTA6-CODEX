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
    ? 'card-animated hover:border-gta-accent/60 hover:shadow-gta-md'
    : 'transition-colors duration-300'

  return (
    <div
      className={`
        rounded-xl border border-gta-border bg-gta-card p-6 shadow-gta-sm
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
  return <div className={`border-b border-gta-border pb-4 ${className}`}>{children}</div>
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`py-4 ${className}`}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`border-t border-gta-border pt-4 ${className}`}>{children}</div>
}
