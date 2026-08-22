'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HeroNewsFlashItem {
  slug: string
  type: string
  title: string
}

interface HeroNewsFlashProps {
  items: HeroNewsFlashItem[]
  /** Intervalo de rotación en ms. Default 6000 — más lento que WordRotate
      (2500ms) porque acá el usuario tiene que leer un titular completo,
      no una sola palabra. */
  intervalMs?: number
}

/**
 * Versión rotativa del flash de "última filtración" del hero: en vez de
 * mostrar un único titular fijo, cicla entre las últimas noticias reales
 * (`items`, ya ordenadas por fecha por el caller) para dejar ver que hay
 * más de una novedad sin ocupar más espacio vertical. Se pausa por
 * completo con hover/focus (el usuario está por hacer click, no hay que
 * cambiarle el link debajo del cursor) y con prefers-reduced-motion
 * (queda fijo en el primer item, el más reciente).
 *
 * Los puntitos de abajo (`hero-news-flash-dots`) ahora son controles
 * reales, no solo un indicador visual de "cuántos hay": antes eran
 * `<span aria-hidden>` sin ningún `onClick`, así que parecían — por
 * convención de cualquier carrusel/rotador con dots — que se podían
 * tocar para saltar a un titular puntual, pero no hacían nada. Eso es
 * un problema de affordance (invitan a una interacción que no existe) y
 * de accesibilidad (quedaban completamente invisibles para lectores de
 * pantalla). Ahora son `<button>` reales que fijan el índice y pausan
 * la rotación (mismo `paused` que ya usa el hover del link principal),
 * con su propio `aria-label` describiendo qué titular seleccionan.
 *
 * Por eso el elemento raíz dejó de ser un único `<Link>`: un `<button>`
 * anidado dentro de un `<a>` es HTML inválido (interactivo dentro de
 * interactivo) y rompe la navegación por teclado. Ahora el link real
 * (badge + titular + flecha) y los botones de los dots son hermanos
 * dentro de un `<div>` — mismo aspecto visual (`.hero-news-flash` sigue
 * en el contenedor), pero cada control es su propio elemento enfocable.
 */
export function HeroNewsFlash({ items, intervalMs = 6000 }: HeroNewsFlashProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion || paused || items.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [reducedMotion, paused, items.length, intervalMs])

  const current = items[index]
  if (!current) return null

  return (
    <div
      className="hero-news-flash glass-surface inline-flex max-w-full items-center gap-2.5 rounded-full border border-gta-border/70 px-4 py-2 hover:-translate-y-0.5 hover:border-gta-accent/60"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Link
        href={`/${current.type}/${current.slug}`}
        className="flex min-w-0 items-center gap-2.5 text-left"
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        aria-label={`Última filtración: ${current.title}`}
      >
        <span className="hero-news-flash-badge shrink-0 rounded-full bg-gta-accent px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-gta-darker">
          Última filtración
        </span>
        {/* aria-live="off": el titular cambia solo, cada 6s — anunciarlo
            cada vez a un lector de pantalla sería ruido, no información
            útil (mismo criterio que WordRotate.tsx en el título de arriba). */}
        <span key={current.slug} className="hero-news-flash-title truncate text-sm text-gta-text-secondary" aria-live="off">
          {current.title}
        </span>
        <span className="hero-news-flash-arrow shrink-0 text-gta-accent" aria-hidden="true">
          →
        </span>
      </Link>
      {items.length > 1 && (
        <span className="hero-news-flash-dots ml-1 flex shrink-0 items-center gap-2.5" aria-label="Elegir titular">
          {items.map((item, i) => (
            <button
              key={item.slug}
              type="button"
              className="hero-news-flash-dot h-1 w-1 rounded-full"
              data-active={i === index}
              aria-current={i === index}
              aria-label={`Titular ${i + 1} de ${items.length}: ${item.title}`}
              onClick={() => {
                setIndex(i)
                setPaused(true)
              }}
              onMouseEnter={() => setPaused(true)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            />
          ))}
        </span>
      )}
    </div>
  )
}
