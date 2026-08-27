'use client'

import { useEffect, useRef } from 'react'

/**
 * Capítulo 4.3 — CURSOR REACTIVO (elástico/magnético)
 *
 * Cursor custom SVG que se estira levemente en la dirección del scroll
 * cuando la velocidad es alta. Simula elasticidad/presencia física.
 *
 * Técnica típica de sitios Awwwards (cursor magnético). Aquí se implementa
 * sin librerías externas, leyendo --scroll-speed directamente del DOM.
 *
 * La lógica:
 * 1. Renderiza un cursor SVG invisible (pointer-events: none)
 * 2. Trackea movimiento del ratón
 * 3. Aplica transform en dirección del último scroll (arriba/abajo)
 * 4. El factor de estiramiento se basa en --scroll-speed
 * 5. Restaura forma natural cuando scroll se detiene
 */

export function ElasticCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const scrollDirectionRef = useRef<'up' | 'down'>('down')
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configurar canvas para devicePixelRatio (retina displays)
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`

    let lastScrollY = 0

    // Detectar dirección del scroll
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      scrollDirectionRef.current = currentScrollY > lastScrollY ? 'down' : 'up'
      lastScrollY = currentScrollY
    }

    // Trackear movimiento del ratón
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY

      // Estimar velocidad simple del cursor (cambio de posición)
      velocityRef.current.x = e.movementX
      velocityRef.current.y = e.movementY
    }

    // Dibujar cursor elástico
    const drawCursor = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const { x, y } = mouseRef.current
      const root = document.documentElement
      const scrollSpeed = parseFloat(
        getComputedStyle(root).getPropertyValue('--scroll-speed') || '0'
      )

      // Tamaño base del cursor
      const baseRadius = 8
      const centerX = x / window.devicePixelRatio
      const centerY = y / window.devicePixelRatio

      // Estiramiento basado en scroll speed: 0..0.4 (sin estiramiento)
      // 0.4..1.0 (estiramiento progresivo hasta 1.6x en dirección del scroll)
      const stretchFactor = Math.max(0, (scrollSpeed - 0.3) * 1.5)
      const stretchIntensity = Math.min(1, stretchFactor)

      // Aplicar estiramiento en dirección del scroll
      let radiusY = baseRadius
      let radiusX = baseRadius

      if (scrollDirectionRef.current === 'down') {
        // Scroll hacia abajo: cursor se estira verticalmente hacia abajo
        radiusY = baseRadius * (1 + stretchIntensity * 0.6)
        centerY += stretchIntensity * 3 // desplazar levemente hacia abajo
      } else {
        // Scroll hacia arriba: cursor se estira hacia arriba
        radiusY = baseRadius * (1 + stretchIntensity * 0.6)
        centerY -= stretchIntensity * 3 // desplazar levemente hacia arriba
      }

      // Opacidad: más sólido en scroll rápido
      const opacity = 0.5 + scrollSpeed * 0.3

      // Dibujar círculo/óvalo elástico
      ctx.fillStyle = `rgba(255, 47, 143, ${opacity})`
      ctx.strokeStyle = `rgba(34, 211, 238, ${opacity * 0.6})`
      ctx.lineWidth = 1.5

      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Glow sutil en pico de velocidad
      if (scrollSpeed > 0.5) {
        ctx.fillStyle = `rgba(255, 47, 143, ${opacity * 0.15})`
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX + 4, radiusY + 4, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameRef.current = requestAnimationFrame(drawCursor)
    }

    // Crear observer para reajustar canvas al redimensionar
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }

    // Montar listeners
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

    // Iniciar loop de dibujo
    drawCursor()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 cursor-none"
      style={{
        // Forzar que el canvas esté por encima pero sin bloquear interacción
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  )
}
