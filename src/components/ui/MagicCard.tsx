'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn, hasFinePointer, prefersReducedMotion } from '@/lib/utils'

interface MagicCardBaseProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientFrom?: string
  gradientTo?: string
  /**
   * Tilt 3D muy sutil (max ±2deg) que sigue al cursor, reservado para
   * cards Level 3 (premium/featured). Reutiliza el mismo pointermove
   * que ya alimenta el spotlight — no agrega listeners ni cálculos
   * de layout adicionales (getBoundingClientRect ya se llamaba antes).
   * Se desactiva junto con el resto de la interactividad en touch y
   * prefers-reduced-motion (mismo flag `interactive`).
   */
  tilt?: boolean
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
    gradientColor = '#1a1a1a',
    gradientOpacity = 0.8,
    gradientFrom = '#00d000',
    gradientTo = '#ff6600',
    mode = 'gradient',
    tilt = false,
  } = props

  const glowFrom = isOrbMode(props) ? (props.glowFrom ?? '#ff6600') : '#ff6600'
  const glowTo = isOrbMode(props) ? (props.glowTo ?? '#00d000') : '#00d000'
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
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      ref.current.style.setProperty('--mx', `${x}px`)
      ref.current.style.setProperty('--my', `${y}px`)
      if (tilt) {
        const normX = x / rect.width - 0.5 // -0.5..0.5
        const normY = y / rect.height - 0.5
        const MAX_TILT = 2 // grados, tope duro pedido en Fase 5
        ref.current.style.setProperty('--tilt-y', `${(normX * MAX_TILT * 2).toFixed(2)}deg`)
        ref.current.style.setProperty('--tilt-x', `${(-normY * MAX_TILT * 2).toFixed(2)}deg`)
      }
    },
    [interactive, tilt]
  )

  return (
    <div
      ref={ref}
      className={cn(
        'magic-card group relative isolate overflow-hidden rounded-lg',
        interactive && 'magic-card--interactive',
        interactive && tilt && 'magic-card--tilt',
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => interactive && ref.current?.classList.add('magic-card--active')}
      onPointerLeave={() => {
        ref.current?.classList.remove('magic-card--active')
        if (tilt) {
          ref.current?.style.setProperty('--tilt-x', '0deg')
          ref.current?.style.setProperty('--tilt-y', '0deg')
        }
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
