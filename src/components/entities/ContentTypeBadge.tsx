/**
 * ============================================================================
 * CONTENT TYPE BADGE — P1-06 AUDIT FIX
 * ============================================================================
 *
 * MEJORA APLICADA:
 * Distinguir visualmente entre:
 * - Fichas técnicas verificadas (Vehículos/Fabricantes)
 * - Contenido editorial (Guías/Noticias)
 * - Contenido especulativo (si aplica)
 *
 * ISSUE REPORTADO (auditoría P1-06):
 * "El límite entre ficha técnica verificada y contenido editorial no existe
 *  visualmente. Ambos comparten exactamente el mismo componente visual y
 *  el mismo sistema de confianza ('nivel de evidencia'), lo cual devalúa
 *  justo el diferencial que el proyecto dice tener."
 *
 * SOLUTION:
 * Agregar un badge visual en EntityCard que identifique el tipo de contenido.
 * - Verde/Verificado para fichas técnicas
 * - Naranja/Editorial para guías y noticias
 * - Gris/Especulativo para rumores
 */

import { EntityType, type Entity } from '@/types'
import { cn } from '@/lib/utils'

interface ContentTypeBadgeProps {
  entity: Entity
  className?: string
}

/**
 * Devuelve la configuración de badge para un tipo de entidad
 */
function getBadgeConfig(entity: Entity) {
  // Fichas técnicas verificadas (Vehículos con evidencia)
  if (entity.type === EntityType.VEHICLE) {
    const hasEvidence = entity.evidence && entity.evidence.level
    return {
      label: hasEvidence ? 'Ficha técnica' : 'Vehículo',
      bgColor: 'bg-archive-green/10',
      textColor: 'text-archive-green',
      borderColor: 'border-archive-green/20',
      isDifferential: true, // Es el core del sitio
    }
  }

  // Fabricantes (también verificados)
  if (entity.type === EntityType.MANUFACTURER) {
    return {
      label: 'Fabricante',
      bgColor: 'bg-archive-green/10',
      textColor: 'text-archive-green',
      borderColor: 'border-archive-green/20',
      isDifferential: true,
    }
  }

  // Contenido editorial: Guías
  if (entity.type === EntityType.GUIDE) {
    return {
      label: 'Guía editorial',
      bgColor: 'bg-oxide-red/10',
      textColor: 'text-oxide-red',
      borderColor: 'border-oxide-red/20',
      isDifferential: false, // No es fichas técnicas verificadas
    }
  }

  // Contenido editorial: Noticias
  if (entity.type === EntityType.NEWS) {
    return {
      label: 'Noticia',
      bgColor: 'bg-oxide-red/10',
      textColor: 'text-oxide-red',
      borderColor: 'border-oxide-red/20',
      isDifferential: false,
    }
  }

  // Default (fallback)
  return {
    label: 'Contenido',
    bgColor: 'bg-ink/5',
    textColor: 'text-ink/60',
    borderColor: 'border-ink/20',
    isDifferential: false,
  }
}

/**
 * Badge que aparece en EntityCard para distinguir tipos de contenido
 * 
 * Uso:
 * ```tsx
 * <ContentTypeBadge entity={entity} />
 * ```
 * 
 * O sin mostrar: (para fichas técnicas verificadas)
 * ```tsx
 * {entity.type !== EntityType.VEHICLE && entity.type !== EntityType.MANUFACTURER && (
 *   <ContentTypeBadge entity={entity} />
 * )}
 * ```
 */
export function ContentTypeBadge({ entity, className }: ContentTypeBadgeProps) {
  const config = getBadgeConfig(entity)

  // Opción 1: Mostrar siempre (máxima claridad)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em]',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      <span aria-hidden="true">•</span>
      {config.label}
    </span>
  )
}

/**
 * Versión que solo muestra badge para contenido editorial
 * (No muestra badge para fichas técnicas)
 * 
 * Uso en EntityCard (recomendado):
 * ```tsx
 * <ContentTypeBadgeConditional entity={entity} />
 * ```
 */
export function ContentTypeBadgeConditional({ entity, className }: ContentTypeBadgeProps) {
  const config = getBadgeConfig(entity)
  
  // Solo mostrar si no es contenido diferencial (no es ficha técnica)
  if (config.isDifferential) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em]',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      <span aria-hidden="true">•</span>
      {config.label}
    </span>
  )
}

/**
 * Helper para acceder a la etiqueta sin renderizar el componente
 * (para usar en aria-labels o accesibilidad)
 */
export function getContentTypeLabel(entity: Entity): string {
  return getBadgeConfig(entity).label
}
