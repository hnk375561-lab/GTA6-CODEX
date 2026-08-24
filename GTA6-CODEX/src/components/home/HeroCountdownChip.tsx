'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CountdownTarget } from './LaunchCountdown'

interface HeroCountdownChipProps {
  targets: CountdownTarget[]
}

/**
 * Versión compacta, de una sola línea, del hub de countdown completo
 * (`LaunchCountdown`, sección "#countdown" más abajo) — vive en el hero
 * para que el hito más próximo (evento Netflix o lanzamiento, lo que
 * esté más cerca) se vea sin bajar del primer viewport. Al hacer click
 * hace scroll a la sección completa en vez de duplicar el countdown
 * detallado acá arriba.
 *
 * El cálculo de "cuántos días faltan" solo puede hacerse en el cliente
 * (mismo motivo que `LaunchCountdown`): la página es estática (SSG), así
 * que un valor calculado en el server quedaría congelado en el momento
 * del build. Por eso el primer render no muestra nada (return null) hasta
 * que el efecto corre en el navegador.
 *
 * Recálculo periódico (corrección real, no cosmética): antes el cálculo
 * corría una única vez al montar y nunca más — si alguien dejaba la
 * pestaña abierta cruzando la medianoche, este chip seguía mostrando
 * "Faltan 3 días" mientras `LaunchCountdown` (que sí tickea cada
 * segundo, ver `LaunchCountdown.tsx`) ya mostraba 2 más abajo en la
 * misma página: dos fuentes de verdad del mismo dato, desincronizadas.
 * Peor aún, si el hito más próximo se alcanzaba con la pestaña abierta,
 * el chip nunca pasaba al *siguiente* hito (quedaba mostrando el ya
 * ocurrido, sin actualizarse jamás). Un `setInterval` de un minuto —de
 * sobra para una cifra en días, sin el costo de un tick por segundo que
 * sí necesita el reloj HH:MM:SS de `LaunchCountdown`— vuelve a evaluar
 * "cuál es el hito más próximo ahora" en cada pasada, así que también
 * migra automáticamente de un hito alcanzado al siguiente.
 */
export function HeroCountdownChip({ targets }: HeroCountdownChipProps) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [nearest, setNearest] = useState<CountdownTarget | null>(null)

  useEffect(() => {
    const evaluate = () => {
      const now = Date.now()
      // El hito "más próximo" es el de menor diferencia positiva a hoy —
      // ya alcanzados (diff <= 0) quedan afuera, no tiene sentido mostrar
      // un contador negativo acá.
      const upcoming = targets
        .map((t) => ({ target: t, diff: new Date(t.targetIso).getTime() - now }))
        .filter((t) => t.diff > 0)
        .sort((a, b) => a.diff - b.diff)[0]

      if (!upcoming) {
        setNearest(null)
        setDaysLeft(null)
        return
      }
      setNearest(upcoming.target)
      setDaysLeft(Math.ceil(upcoming.diff / 86_400_000))
    }

    evaluate()
    const id = setInterval(evaluate, 60_000)
    return () => clearInterval(id)
  }, [targets])

  if (!nearest || daysLeft === null) return null

  return (
    <Link
      href="#countdown"
      className="hero-countdown-chip glass-surface inline-flex items-center gap-2 rounded-full border border-auto-border/70 px-4 py-2 text-sm text-auto-text-secondary hover:-translate-y-0.5 hover:border-auto-accent/60"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: nearest.accent }} aria-hidden="true" />
      <span>
        Faltan <strong className="font-display font-bold text-auto-text">{daysLeft}</strong>{' '}
        {daysLeft === 1 ? 'día' : 'días'} para {nearest.label.toLowerCase()}
      </span>
    </Link>
  )
}
