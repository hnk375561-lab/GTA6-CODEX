import { cn } from '@/lib/utils'

interface SectionBridgeProps {
  /** Clases extra (por ej. márgenes para espaciar la costura). */
  className?: string
  /** `true` = la costura ocupa solo el alto mínimo (para meterla adentro
      de un gap existente sin agregar espacio vertical nuevo). */
  compact?: boolean
}

/**
 * Puente entre secciones: la hairline de gradiente que crece cuando la
 * siguiente sección entra al viewport (`view()` timeline donde hay
 * soporte; estática donde no; idle con prefers-reduced-motion). Es
 * decorativo puro (`aria-hidden`): solo aporta un hilo visual entre
 * capítulos (alto mínimo 8px, o el espaciado de `h-6 sm:h-10` cuando se
 * la usa como separador con aire propio) y no altera la estructura de la
 * página.
 */
export function SectionBridge({ className, compact = false }: SectionBridgeProps) {
  return <div aria-hidden="true" className={cn('section-bridge', compact ? 'h-2' : 'h-6 sm:h-10', className)} />
}