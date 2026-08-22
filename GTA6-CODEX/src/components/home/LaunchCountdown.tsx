'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Reveal } from '@/components/ui/Reveal'

export interface CountdownTarget {
  id: string
  label: string
  /** Detalle corto bajo el título (ej. horarios de cada plataforma). */
  detail?: string
  /** Fecha/hora ISO del hito. Si incluye offset horario (ej. `-04:00`),
   *  la cuenta regresiva apunta al mismo instante real para cualquier
   *  visitante sin importar su zona horaria — correcto para un evento
   *  puntual como el estreno de Netflix. Si es una fecha sin hora (ej.
   *  lanzamiento del juego, sin horario global confirmado), se interpreta
   *  como medianoche en la zona horaria del propio visitante. */
  targetIso: string
  pendingLabel: string
  reachedLabel: string
  newsHref?: string
  newsLabel?: string
  accent: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function computeTimeLeft(targetIso: string): TimeLeft | null {
  const diff = new Date(targetIso).getTime() - Date.now()
  if (!Number.isFinite(diff) || diff <= 0) return null
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  }
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function formatLocalDateTime(targetIso: string): string | null {
  const d = new Date(targetIso)
  if (Number.isNaN(d.getTime())) {
    // `targetIso` viene de contenido editorial (no de un formulario), así
    // que un valor inválido es casi siempre un typo en el JSON fuente. En
    // producción el componente ya lo maneja bien (el bloque de fecha
    // simplemente no se renderiza — ver `{localDateTime && (...)}` más
    // abajo), pero sin este warning ese typo queda silencioso y nadie se
    // entera hasta notar la fecha faltante a simple vista.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[LaunchCountdown] targetIso inválido, no se pudo formatear: "${targetIso}"`)
    }
    return null
  }
  return d.toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Hub de "Cuenta regresiva / Estado del lanzamiento" (mejora 1.3 del
 * análisis): las dos fechas ancla del proyecto — evento Netflix y
 * lanzamiento — reunidas en un solo lugar con countdown en vivo, en vez de
 * vivir dispersas solo dentro de `noticias/`.
 *
 * Cada `CountdownTarget` llega ya resuelto desde `page.tsx` (que decide
 * cuál es la noticia más relevante de cada fecha vía tags) — este
 * componente es puramente de presentación + el tick del reloj, que sí
 * necesita ser cliente.
 */
export function LaunchCountdown({ targets }: { targets: CountdownTarget[] }) {
  return (
    <Reveal className="stagger grid grid-cols-1 gap-6 lg:grid-cols-2">
      {targets.map((target) => (
        <CountdownCard key={target.id} target={target} />
      ))}
    </Reveal>
  )
}

function CountdownCard({ target }: { target: CountdownTarget }) {
  // El cálculo real solo puede hacerse en el cliente: si se calculara
  // también en el server, el HTML estático quedaría con el countdown
  // "congelado" en el momento del build, no en el momento en que alguien
  // realmente abre la página. Por eso el primer render muestra un
  // esqueleto (`mounted === false`) y recién después de montar se pisa
  // con el valor real — evita mostrar un número stale, aunque sea por un
  // instante.
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setMounted(true)
    setTimeLeft(computeTimeLeft(target.targetIso))
    const id = setInterval(() => setTimeLeft(computeTimeLeft(target.targetIso)), 1000)
    return () => clearInterval(id)
  }, [target.targetIso])

  const reached = mounted && timeLeft === null
  const localDateTime = formatLocalDateTime(target.targetIso)

  return (
    <div className="countdown-card glass-surface relative overflow-hidden rounded-2xl border border-gta-border p-6 sm:p-8">
      <span
        className="countdown-card-glow pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-25 blur-3xl"
        style={{ background: target.accent }}
        aria-hidden="true"
      />

      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: target.accent }} aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gta-text-tertiary">
            {reached ? target.reachedLabel : target.pendingLabel}
          </p>
        </div>

        <h3 className="mb-1 font-display text-xl font-bold text-gta-text sm:text-2xl">{target.label}</h3>
        {target.detail && <p className="mb-5 text-sm text-gta-text-secondary">{target.detail}</p>}

        {!mounted ? (
          <div className="mb-5 grid grid-cols-4 gap-2 sm:gap-3" aria-hidden="true">
            {['Días', 'Hs', 'Min', 'Seg'].map((label) => (
              <div key={label} className="rounded-xl border border-gta-border bg-gta-card/60 py-3 text-center">
                <span className="block font-mono text-2xl font-bold text-gta-text-tertiary sm:text-3xl">--</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
                  {label}
                </span>
              </div>
            ))}
          </div>
        ) : reached ? (
          <p className="mb-5 rounded-xl border border-gta-border bg-gta-card/60 px-4 py-3.5 text-sm font-semibold text-gta-text">
            {target.reachedLabel}
          </p>
        ) : (
          <div className="mb-5 grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label={`${target.label}: ${timeLeft!.days} días, ${timeLeft!.hours} horas, ${timeLeft!.minutes} minutos, ${timeLeft!.seconds} segundos`}>
            {[
              { value: timeLeft!.days, label: 'Días' },
              { value: timeLeft!.hours, label: 'Hs' },
              { value: timeLeft!.minutes, label: 'Min' },
              { value: timeLeft!.seconds, label: 'Seg' },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-xl border border-gta-border bg-gta-card/60 py-3 text-center" aria-hidden="true">
                <span className="block font-mono text-2xl font-bold tabular-nums text-gta-text sm:text-3xl">
                  {pad(value)}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {localDateTime && (
          <p className="mb-4 text-xs text-gta-text-tertiary">
            {reached ? 'Fue el' : 'Llega el'} {localDateTime} <span className="opacity-70">(tu hora local)</span>
          </p>
        )}

        {target.newsHref && target.newsLabel && (
          <Link
            href={target.newsHref}
            className="link-underline group inline-flex items-start gap-1.5 text-sm font-semibold text-gta-accent transition-colors hover:text-gta-accent-strong"
          >
            <span className="line-clamp-2">{target.newsLabel}</span>
            <span className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </div>
  )
}
