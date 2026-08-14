'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  className?: string
  suffix?: string
  prefix?: string
}

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/**
 * Anima un número entero de 0 -> end cuando entra en el viewport.
 * Respeta prefers-reduced-motion mostrando el valor final directamente.
 */
export function CountUp({ end, duration = 1400, className = '', suffix = '', prefix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setValue(end)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()

          const tick = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            setValue(Math.round(easeOutExpo(progress) * end))
            if (progress < 1) requestAnimationFrame(tick)
          }

          requestAnimationFrame(tick)
          observer.unobserve(node)
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [end, duration])

  return (
    <span ref={ref} className={`count-up ${className}`.trim()}>
      {prefix}
      {value.toLocaleString('es-ES')}
      {suffix}
    </span>
  )
}
