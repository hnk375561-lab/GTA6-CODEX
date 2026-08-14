import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function Card({ children, className = '', hoverable = false }: CardProps) {
  const hoverClass = hoverable
    ? 'card-animated hover:border-gta-accent hover:shadow-gta-md'
    : 'transition-colors duration-300'

  return (
    <div
      className={`
        rounded-lg border border-gta-border bg-gta-card p-6
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
