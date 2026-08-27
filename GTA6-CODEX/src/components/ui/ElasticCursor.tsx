'use client'

import { useEffect, useRef } from 'react'

export function ElasticCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const scrollDirectionRef = useRef<'up' | 'down'>('down')
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`

    let lastScrollY = 0

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      scrollDirectionRef.current = currentScrollY > lastScrollY ? 'down' : 'up'
      lastScrollY = currentScrollY
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    const drawCursor = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const { x, y } = mouseRef.current
      const root = document.documentElement
      const scrollSpeed = parseFloat(
        getComputedStyle(root).getPropertyValue('--scroll-speed') || '0'
      )

      const baseRadius = 8
      const centerX = x / window.devicePixelRatio
      const centerY = y / window.devicePixelRatio

      const stretchFactor = Math.max(0, (scrollSpeed - 0.3) * 1.5)
      const stretchIntensity = Math.min(1, stretchFactor)

      let radiusY = baseRadius
      let radiusX = baseRadius
      let offsetY = 0

      if (scrollDirectionRef.current === 'down') {
        radiusY = baseRadius * (1 + stretchIntensity * 0.6)
        offsetY = stretchIntensity * 3
      } else {
        radiusY = baseRadius * (1 + stretchIntensity * 0.6)
        offsetY = stretchIntensity * -3
      }

      const opacity = 0.5 + scrollSpeed * 0.3

      ctx.fillStyle = `rgba(255, 47, 143, ${opacity})`
      ctx.strokeStyle = `rgba(34, 211, 238, ${opacity * 0.6})`
      ctx.lineWidth = 1.5

      ctx.beginPath()
      ctx.ellipse(centerX, centerY + offsetY, radiusX, radiusY, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (scrollSpeed > 0.5) {
        ctx.fillStyle = `rgba(255, 47, 143, ${opacity * 0.15})`
        ctx.beginPath()
        ctx.ellipse(centerX, centerY + offsetY, radiusX + 4, radiusY + 4, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameRef.current = requestAnimationFrame(drawCursor)
    }

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

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
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  )
}
