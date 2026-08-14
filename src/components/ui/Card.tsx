import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /**
   * @deprecated usar `level={2}`. Se mantiene para no romper componentes
   * existentes: hoverable=true equivale a level=2.
   */
  hoverable?: boolean
  /**
   * Jerarquía visual de la card (ver CARD SYSTEM en globals.css):
   *  1 = limpia, hover mínimo. Para listados grandes (50-100 cards):
   *      listing por tipo, resultados de búsqueda.
   *  2 = destacada: glow de borde + shine sutil. Para grillas curadas y
   *      pequeñas (categorías del home, ~6 cards).
   * Level 3 (premium) no se arma acá: es MagicCard + ShineBorder
   * compuestos directamente donde se necesite (ver Home "Destacados"),
   * porque requiere seguimiento de cursor que no toda card necesita.
   */
  level?: 1 | 2
}

export function Card({ children, className = '', hoverable = false, level }: CardProps) {
  const resolvedLevel = level ?? (hoverable ? 2 : undefined)
  const hoverClass =
    resolvedLevel === 2
      ? 'card-lvl2 hover:border-gta-accent hover:shadow-gta-md'
      : resolvedLevel === 1
        ? 'card-lvl1 hover:border-gta-accent/60'
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
