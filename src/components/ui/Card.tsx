'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function Card({ children, className = '', hoverable = false }: CardProps) {
  const hoverClass = hoverable
    ? 'tap-scale hover:border-auto-accent/50 hover:shadow-md hover:-translate-y-0.5 transition duration-300'
    : 'transition-colors duration-300'

  return (
    <div
      className={`
        rounded-2xl border border-edge bg-surface-card p-6 shadow-sm
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
  return <div className={`border-b border-edge pb-4 ${className}`}>{children}</div>
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`py-4 ${className}`}>{children}</div>
}

