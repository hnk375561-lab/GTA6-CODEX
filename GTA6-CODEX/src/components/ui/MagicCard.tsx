'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn, hasFinePointer, prefersReducedMotion } from '@/lib/utils'
import { webglSceneBus } from '@/lib/webgl/scene-bus'

interface MagicCardBaseProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientFrom?: string
  gradientTo?: string
}

interface MagicCardGradientProps extends MagicCardBaseProps {
  mode?: 'gradient'
  gradientColor?: string
  gradientOpacity?: number
  glowFrom?: never
  glowTo?: never
  glowSize?: never
  glowBlur?: never
  glowOpacity?: never
}

interface MagicCardOrbProps extends MagicCardBaseProps {
  mode: 'orb'
  glowFrom?: string
  glowTo?: string
  glowSize?: number
  glowBlur?: number
  glowOpacity?: number
  gradientColor?: never
  gradientOpacity?: never
}

type MagicCardProps = MagicCardGradientProps | MagicCardOrbProps

function isOrbMode(props: MagicCardProps): props is MagicCardOrbProps {
  return props.mode === 'orb'
}

/**
 * Card con spotlight/orb que sigue al cursor.
 *
 * Reimplementada sin `motion/react`: la versión original traía ~150KB de
 * dependencia (springs, motion values) para un efecto que se resuelve con
 * CSS custom properties actualizadas directamente vía `style.setProperty`
 * en el listener de puntero — sin re-render de React, sin reflow (solo
 * repinta un `background`/`opacity`), y con el mismo resultado visual.
 *
 * El seguimiento del cursor solo se activa con puntero fino (desktop) y
 * cuando el usuario no pide reduced-motion; en el resto de los casos la
 * card se degrada a un borde/gradiente estático, sin JS de por medio.
 */
export function MagicCard(props: MagicCardProps) {
  const {
    children,
    className,
    gradientSize = 200,
    gradientColor = '#121212',
    gradientOpacity = 0.8,
    gradientFrom = '#787878',
    gradientTo = '#a1a1a1',
    mode = 'gradient',
  } = props

  const glowFrom = isOrbMode(props) ? (props.glowFrom ?? '#787878') : '#787878'
  const glowTo = isOrbMode(props) ? (props.glowTo ?? '#a1a1a1') : '#a1a1a1'
  const glowSize = isOrbMode(props) ? (props.glowSize ?? 420) : 420
  const glowBlur = isOrbMode(props) ? (props.glowBlur ?? 60) : 60
  const glowOpacity = isOrbMode(props) ? (props.glowOpacity ?? 0.9) : 0.9

  const ref = useRef<HTMLDivElement>(null)
  const [interactive, setInteractive] = useState(false)

  useEffect(() => {
    setInteractive(hasFinePointer() && !prefersReducedMotion())
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || e.pointerType !== 'mouse' || !ref.current) return
      const rect = e.currentTarget.getBoundingClientRect()
      ref.current.style.setProperty('--mx', `${e.clientX - rect.left}px`)
      ref.current.style.setProperty('--my', `${e.clientY - rect.top}px`)
    },
    [interactive]
  )

  return (
    <div
      ref={ref}
      className={cn(
        'magic-card group relative isolate overflow-hidden rounded-lg',
        interactive && 'magic-card--interactive',
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => {
        if (!interactive) return
        ref.current?.classList.add('magic-card--active')
        // Intención real de cursor sobre UI interactiva → el motor WebGL
        // puede reaccionar (partículas/bloom), no solo el CSS local.
        webglSceneBus.setPointerIntent(1)
      }}
      onPointerLeave={() => {
        ref.current?.classList.remove('magic-card--active')
        if (interactive) webglSceneBus.setPointerIntent(0)
      }}
      style={
        {
          '--mgs': `${gradientSize}px`,
          '--mg-from': gradientFrom,
          '--mg-to': gradientTo,
          '--mg-color': gradientColor,
          '--mg-opacity': gradientOpacity,
          '--glow-from': glowFrom,
          '--glow-to': glowTo,
          '--glow-size': `${glowSize}px`,
          '--glow-blur': `${glowBlur}px`,
          '--glow-opacity': glowOpacity,
        } as React.CSSProperties
      }
    >
      {mode === 'gradient' && <div className="magic-card-gradient" aria-hidden="true" />}
      {mode === 'orb' && <div className="magic-card-orb" aria-hidden="true" />}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
