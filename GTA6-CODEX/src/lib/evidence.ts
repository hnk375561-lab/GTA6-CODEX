import { BaseEntity } from '@/types'

/** Mismo patrón de derivación que ya usa EvidenceBlock.tsx: `Evidence` no
 *  se reexporta desde `@/types` (solo `BaseEntity`), así que se deriva acá
 *  en vez de tocar el barrel de tipos para un solo tipo interno. */
type Evidence = NonNullable<BaseEntity['evidence']>
export type EvidenceLevel = Evidence['level']

interface EvidenceStampMeta {
  /** Glifo del sello (mismo lenguaje que EvidenceBlock en la ficha completa). */
  icon: string
  /** Etiqueta corta para el sello compacto de la card (espacio limitado). */
  shortLabel: string
  /** Clases Tailwind del sello — mismo par color/opacidad que ya usa
   *  EvidenceBlock para cada nivel, así el color de "confianza" es
   *  consistente entre la card y la ficha completa. */
  className: string
}

/**
 * Metadata compacta de nivel de evidencia para el "sello" que ahora se
 * muestra siempre en la esquina de EntityCard (antes este dato solo vivía
 * en EvidenceBlock, dentro de la ficha — el diferencial editorial del
 * sitio quedaba invisible en el punto de mayor tráfico: el grid de
 * listado). Deliberadamente compacto: 3 niveles se agrupan en 2 estilos
 * visuales (oficial-* siempre lee "verde/confirmado" para el usuario,
 * la distinción nombrado/visual/multifuente es un detalle que se explica
 * en la ficha, no en el grid).
 */
export const EVIDENCE_STAMP_META: Record<EvidenceLevel, EvidenceStampMeta> = {
  'oficial-nombrado': {
    icon: '✓',
    shortLabel: 'Oficial',
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  },
  'oficial-visual-multifuente': {
    icon: '◎',
    shortLabel: 'Oficial · visual',
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  },
  'oficial-visual': {
    icon: '◎',
    shortLabel: 'Oficial · visual',
    className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  },
  respaldado: {
    icon: '◈',
    shortLabel: 'Respaldado',
    className: 'border-auto-accent-orange/25 bg-auto-accent-orange/10 text-auto-accent-orange',
  },
  especulativo: {
    icon: '?',
    shortLabel: 'Especulativo',
    className: 'border-auto-accent-warning/25 bg-auto-accent-warning/10 text-auto-accent-warning',
  },
}
