'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Techo subido de 4x a 6x (29 ago 2026): las fotos fuente llegan a
// 3840x2160 real (ver deviceSizes en next.config.js, subido en el mismo
// cambio) — con el techo viejo de 4x no se podía llegar a ver el detalle
// real que la foto sí tiene, se topaba con el límite del zoom antes que
// con el de resolución de la imagen.
const MIN_SCALE = 1
const MAX_SCALE = 6
const DOUBLE_CLICK_SCALE = 3
const BUTTON_ZOOM_STEP = 1
// Negativo porque deltaY > 0 significa "rueda hacia abajo" = alejar.
const WHEEL_SENSITIVITY = -0.0022

interface ZoomState {
  scale: number
  x: number
  y: number
}

const IDLE: ZoomState = { scale: MIN_SCALE, x: 0, y: 0 }

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Zoom + paneo para una imagen dentro de un contenedor de tamaño fijo
 * (pensado para el panel de un lightbox con `object-contain`).
 *
 * Soporta, todo sobre el mismo estado `{ scale, x, y }`:
 * - Rueda del mouse (zoom centrado en el cursor)
 * - Pellizco de dos dedos vía Pointer Events (zoom centrado en el punto medio)
 * - Arrastre con un dedo/mouse para desplazar cuando `scale > 1`
 * - Doble click/tap para saltar a `DOUBLE_CLICK_SCALE` (o volver a 1)
 *
 * El paneo se acota a los bordes de `containerRef` en vez de calcular el
 * tamaño real renderizado de la imagen (que con `object-contain` varía según
 * el aspect ratio) — es una aproximación estándar en librerías de pan/zoom y
 * en la práctica se siente correcta porque la imagen nunca ocupa más que el
 * contenedor.
 *
 * Devuelve `containerProps` para spread directo sobre el div que envuelve la
 * imagen, y `style` para aplicar el transform a la imagen misma.
 */
export function useImageZoom() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<ZoomState>(IDLE)
  const stateRef = useRef(state)
  stateRef.current = state

  const [isPanning, setIsPanning] = useState(false)
  const panOrigin = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 })
  const activePointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef({ startDist: 0, startScale: 1 })

  const clamp = useCallback((next: ZoomState): ZoomState => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale))
    const el = containerRef.current
    const w = el?.clientWidth ?? 0
    const h = el?.clientHeight ?? 0
    const maxX = (w * (scale - 1)) / 2
    const maxY = (h * (scale - 1)) / 2
    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
  }, [])

  /** Escala a `targetScale` manteniendo fijo el punto (clientX, clientY). */
  const zoomTo = useCallback(
    (targetScale: number, clientX?: number, clientY?: number) => {
      setState((prev) => {
        const el = containerRef.current
        if (!el || clientX === undefined || clientY === undefined) {
          return clamp({ ...prev, scale: targetScale })
        }
        const rect = el.getBoundingClientRect()
        const cx = clientX - rect.left - rect.width / 2
        const cy = clientY - rect.top - rect.height / 2
        const ratio = targetScale / prev.scale
        const nextX = cx - (cx - prev.x) * ratio
        const nextY = cy - (cy - prev.y) * ratio
        return clamp({ scale: targetScale, x: nextX, y: nextY })
      })
    },
    [clamp]
  )

  const reset = useCallback(() => setState(IDLE), [])

  const zoomInCenter = useCallback(() => {
    const el = containerRef.current
    const rect = el?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : undefined
    const cy = rect ? rect.top + rect.height / 2 : undefined
    zoomTo(Math.min(MAX_SCALE, stateRef.current.scale + BUTTON_ZOOM_STEP), cx, cy)
  }, [zoomTo])

  const zoomOutCenter = useCallback(() => {
    const el = containerRef.current
    const rect = el?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : undefined
    const cy = rect ? rect.top + rect.height / 2 : undefined
    zoomTo(Math.max(MIN_SCALE, stateRef.current.scale - BUTTON_ZOOM_STEP), cx, cy)
  }, [zoomTo])

  const handleDoubleClick = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const next = stateRef.current.scale > MIN_SCALE + 0.01 ? MIN_SCALE : DOUBLE_CLICK_SCALE
      zoomTo(next, e.clientX, e.clientY)
    },
    [zoomTo]
  )

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY)
      const next = stateRef.current.scale * factor
      zoomTo(next, e.clientX, e.clientY)
    },
    [zoomTo]
  )

  // Wheel nativo con { passive: false } — el listener sintético de React
  // sobre `onWheel` no puede hacer preventDefault de forma confiable porque
  // React lo registra como pasivo por defecto.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2) {
      const [a, b] = Array.from(activePointers.current.values())
      pinch.current = { startDist: distanceBetween(a, b), startScale: stateRef.current.scale }
      setIsPanning(false)
    } else if (activePointers.current.size === 1 && stateRef.current.scale > MIN_SCALE + 0.01) {
      panOrigin.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        x: stateRef.current.x,
        y: stateRef.current.y,
      }
      setIsPanning(true)
    }
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!activePointers.current.has(e.pointerId)) return
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (activePointers.current.size === 2) {
        const [a, b] = Array.from(activePointers.current.values())
        const dist = distanceBetween(a, b)
        if (pinch.current.startDist > 0) {
          const midX = (a.x + b.x) / 2
          const midY = (a.y + b.y) / 2
          zoomTo(pinch.current.startScale * (dist / pinch.current.startDist), midX, midY)
        }
        return
      }

      if (isPanning) {
        const dx = e.clientX - panOrigin.current.clientX
        const dy = e.clientY - panOrigin.current.clientY
        setState((prev) => clamp({ ...prev, x: panOrigin.current.x + dx, y: panOrigin.current.y + dy }))
      }
    },
    [clamp, isPanning, zoomTo]
  )

  const endPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) pinch.current.startDist = 0
    if (activePointers.current.size === 0) setIsPanning(false)
  }, [])

  const isZoomed = state.scale > MIN_SCALE + 0.01

  const style = useMemo<React.CSSProperties>(
    () => ({
      transform: `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`,
      transformOrigin: 'center center',
      transition: isPanning ? 'none' : 'transform 220ms var(--ease-out-back, cubic-bezier(0.34,1.56,0.64,1))',
      willChange: 'transform',
      touchAction: 'none',
    }),
    [state.x, state.y, state.scale, isPanning]
  )

  const containerProps = useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer,
      onDoubleClick: handleDoubleClick,
      style: {
        touchAction: 'none' as const,
        cursor: isZoomed ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
      },
    }),
    [onPointerDown, onPointerMove, endPointer, handleDoubleClick, isZoomed, isPanning]
  )

  return {
    containerRef,
    containerProps,
    style,
    scale: state.scale,
    isZoomed,
    isPanning,
    zoomIn: zoomInCenter,
    zoomOut: zoomOutCenter,
    reset,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  }
}
