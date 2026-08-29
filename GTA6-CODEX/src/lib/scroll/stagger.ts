import type { CSSProperties } from 'react'

/** Desaceleración simple hacia el final — para elementos que "llegan" a su lugar. */
function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - c, 3)
}

export interface StaggerOptions {
  /** Fracción del progreso total [0,1] que ocupa la cascada completa (resto queda de "aire"). */
  spread?: number
  /** Desplazamiento vertical inicial en px. */
  distance?: number
}

/**
 * Estilo inline para el N-ésimo de `total` elementos dentro de un panel, en
 * función del progreso *local* de ese panel (0 = recién entrando, 1 =
 * completamente asentado — el mismo `eased` que ya calcula
 * `PinnedScrollStages` para el crossfade del panel).
 *
 * En vez de que todo el contenido de un panel aparezca de golpe con el
 * fundido del panel, cada elemento tiene su propia "ventana" de progreso
 * dentro de esa cascada: el primero termina de entrar rápido, el último
 * recién arranca cuando el panel ya está casi asentado. Da sensación de
 * "vida" (las cosas no llegan todas a la vez) sin agregar ningún listener
 * ni estado nuevo — es puramente una función del mismo progreso que ya se
 * está leyendo por frame.
 */
export function staggerStyle(
  progress: number,
  index: number,
  total: number,
  { spread = 0.6, distance = 16 }: StaggerOptions = {}
): CSSProperties {
  if (total <= 1) {
    const eased = easeOutCubic(progress)
    return {
      opacity: eased,
      transform: `translateY(${(1 - eased) * distance}px)`,
    }
  }
  const step = spread / total
  const start = index * step
  const windowSize = 1 - spread + step // el último elemento igual llega a 1 cuando progress=1
  const local = (progress - start) / windowSize
  const eased = easeOutCubic(local)
  return {
    opacity: eased,
    transform: `translateY(${(1 - eased) * distance}px)`,
  }
}
