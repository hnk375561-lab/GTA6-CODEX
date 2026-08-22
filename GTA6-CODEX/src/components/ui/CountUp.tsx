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
 *
 * Corrección real (integridad de contenido, no cosmética): el estado
 * arrancaba en `useState(0)`, así que el HTML que efectivamente sale del
 * servidor —lo que ve cualquier crawler que no ejecute JS, un bot de
 * preview de redes sociales, o una persona con JS deshabilitado/roto—
 * siempre mostraba "0" en cada cifra del stat strip del hero (0
 * personajes, 0 vehículos, 0 entradas totales...), sin importar cuántas
 * entradas tuviera el sitio en realidad. Eso es exactamente lo opuesto
 * del propósito documentado de esa franja ("las cifras hacen de
 * credencial... antes de pedir la acción", ver `src/app/page.tsx`): para
 * ese segmento de visitantes, la credencial decía "no hay nada acá".
 *
 * Ahora el estado inicial es `end` (el número real, igual en servidor y
 * cliente — cero riesgo de hydration mismatch, ya que React solo compara
 * el HTML inicial, no exige que el estado se quede quieto después). La
 * cuenta hacia arriba pasa a ser un efecto puramente decorativo: recién
 * cuando el elemento entra en viewport y `prefers-reduced-motion` lo
 * permite, se reinicia a 0 por un instante y se anima de vuelta al mismo
 * valor real — mismo resultado visual de antes para quien tiene JS y
 * movimiento activado, pero el valor correcto está siempre presente para
 * cualquier otro caso.
 */
export function CountUp({ end, duration = 1400, className = '', suffix = '', prefix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(end)
  const started = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          setValue(0)
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
