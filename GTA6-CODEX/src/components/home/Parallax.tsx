'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Traslada levemente a sus hijos siguiendo el mouse dentro de todo el
 * viewport (no solo al pasar por encima del elemento) — pensado para el
 * título del hero: da una sensación sutil de "el sitio responde a vos"
 * incluso antes de que el usuario interactúe con nada puntual. `strength`
 * es el desplazamiento máximo en px. Usa `pointermove` en `window` (no un
 * handler sintético de React sobre el propio nodo) para que el efecto
 * arranque desde cualquier punto de la pantalla, no solo al entrar al
 * elemento — antes el listener vivía en el propio `<div>` del título y el
 * movimiento apenas se notaba.
 *
 * Respeta `prefers-reduced-motion`, igual que `PinnedScrollStages`,
 * `CountUp` y `WordRotate`: si está activo, no se agrega el listener y el
 * título queda fijo. Chequea el valor inicial y se suscribe a cambios en
 * caliente (mismo patrón que `PinnedScrollStages`/`RotatingHeroBackground`).
 */
export function Parallax({
  strength = 10,
  className,
  children,
}: {
  strength?: number
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    let raf = 0
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return // sin esto en touch queda "pegado" al último toque
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = ref.current
        if (!el) return
        const nx = (e.clientX / window.innerWidth) * 2 - 1 // [-1, 1]
        const ny = (e.clientY / window.innerHeight) * 2 - 1
        el.style.transform = `translate3d(${nx * strength}px, ${ny * strength * 0.6}px, 0)`
      })
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength, reducedMotion])

  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: 'transform 300ms ease-out', willChange: reducedMotion ? undefined : 'transform' }}
    >
      {children}
    </div>
  )
}

const TILT_MAX_DEG = 6

/**
 * Inclinación 3D sutil al pasar el mouse sobre una card — el mismo
 * lenguaje que Apple/Vercel usan en cards de producto: no es solo un
 * `hover:scale`, la card "sigue" la posición del cursor dentro de sus
 * propios límites. Se resetea suavemente al salir. Ignora touch (no tiene
 * sentido "tiltear" con el dedo encima, y en mobile solo generaría un
 * salto visual al primer tap).
 */
export function TiltCard({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width // [0, 1]
      const py = (e.clientY - rect.top) / rect.height
      const rotateY = (px - 0.5) * TILT_MAX_DEG * 2
      const rotateX = (0.5 - py) * TILT_MAX_DEG * 2
      el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    })
  }, [])

  const onPointerLeave = useCallback(() => {
    const el = ref.current
    if (el) el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
  }, [])

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={className}
      style={{ transition: 'transform 200ms ease-out', transformStyle: 'preserve-3d', willChange: 'transform', ...style }}
    >
      {children}
    </div>
  )
}
