'use client'

import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { staggerStyle, recedeStyle, type StaggerOptions } from '@/lib/scroll/stagger'

/**
 * `PinnedScrollStages` es Client Component, pero `app/page.tsx` (donde vive
 * el contenido real de cada panel) es Server Component — ahí se hace el
 * fetch a la "base" del expediente. No se puede pasar una función como
 * children/prop de Server a Client (Next.js no la puede serializar), así
 * que en vez de eso el progreso local de cada panel se expone por Context:
 * `PinnedScrollStages` (client) provee el valor por panel, y `Reveal`
 * (client, pero usado *dentro* del árbol server) lo consume. Todo lo que
 * cruza el límite server→client es contenido ya renderizado + números
 * (index/total), nunca una función.
 */
const StageProgressContext = createContext(1)
/* Progreso de "retirada" del panel (0 = manda, 1 = cedió su lugar al
   siguiente, ver `recedeStyle`). Separado del de entrada a propósito:
   los `Reveal` de cascada siguen consumiendo solo el de entrada, y el
   shell del panel consume el de salida. */
const StageExitContext = createContext(0)

export function StageProgressProvider({
  progress,
  exit,
  children,
}: {
  progress: number
  exit: number
  children: ReactNode
}) {
  return (
    <StageExitContext.Provider value={exit}>
      <StageProgressContext.Provider value={progress}>{children}</StageProgressContext.Provider>
    </StageExitContext.Provider>
  )
}

export function useStageProgress(): number {
  return useContext(StageProgressContext)
}

export function useStageExit(): number {
  return useContext(StageExitContext)
}

/**
 * Envoltorio para animar un elemento en cascada dentro de su panel: lee el
 * progreso local del Context ambiente y aplica `staggerStyle` según su
 * posición (`index` de `total`). `as` permite que el wrapper sea `span` en
 * vez de `div` cuando el elemento envuelto necesita comportarse inline
 * (ej. un link dentro de una grilla que ya es su propio bloque).
 */
export function Reveal({
  index,
  total,
  options,
  className,
  style,
  children,
}: {
  index: number
  total: number
  options?: StaggerOptions
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}) {
  const progress = useStageProgress()
  return (
    <div className={className} style={{ ...staggerStyle(progress, index, total, options), ...style }}>
      {children}
    </div>
  )
}

/**
 * Shell de un panel dentro del track: aplica la "retirada" (salida) del
 * capítulo a su contenido cuando el siguiente empieza a entrar. Mientras
 * el panel manda (`exit` = 0) no toca nada; cuando el siguiente capítulo
 * crece, el actual sube 2.2% de su propia altura, se difumina a 0.7 y se
 * agranda un 1.8% — el mismo arquetipo "se aleja mientras el próximo se
 * acerca" de un plano secuencia. Zero listeners: lee la misma señal de
 * rAF que ya calcula `PinnedScrollStages`; `prefers-reduced-motion` la
 * deja en 0 y el panel queda estático.
 */
export function StageShell({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const exit = useStageExit()
  const style: CSSProperties = recedeStyle(exit)
  if (exit <= 0) return <div className={className}>{children}</div>
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}
