'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { staggerStyle, type StaggerOptions } from '@/lib/scroll/stagger'

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

export function StageProgressProvider({
  progress,
  children,
}: {
  progress: number
  children: ReactNode
}) {
  return <StageProgressContext.Provider value={progress}>{children}</StageProgressContext.Provider>
}

export function useStageProgress(): number {
  return useContext(StageProgressContext)
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
