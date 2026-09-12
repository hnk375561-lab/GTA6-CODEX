'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function Card({ children, className = '', hoverable = false }: CardProps) {
  const hoverClass = hoverable
    ? 'group/card hover:border-oxide-red/60 hover:shadow-lg hover:-translate-y-1 transition duration-250'
    : 'transition-colors duration-300'

  return (
    <div
      className={`
        rounded-lg border border-edge/40 bg-surface-card shadow-sm overflow-hidden flex flex-col
        ${hoverClass}
        ${className}
      `}
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
  return <div className={`border-b border-edge/30 pb-4 ${className}`}>{children}</div>
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`py-4 ${className}`}>{children}</div>
}
