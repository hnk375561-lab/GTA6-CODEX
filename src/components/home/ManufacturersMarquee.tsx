'use client'

import { useCallback, useId, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ManufacturerMarqueeItem } from '@/lib/vehicle-manufacturers'

interface ManufacturersMarqueeProps {
  manufacturers: ManufacturerMarqueeItem[]
  className?: string
}

/**
 * Un logo del track. `interactive=false` en la copia clon (ver más abajo):
 * queda fuera del tab order y oculta a lectores de pantalla, para no
 * duplicar 75 links navegables por teclado — la copia real ya cubre toda
 * la navegación, el clon solo existe para que el loop de CSS
 * (`translateX(-50%)`) no tenga un salto visible.
 */
function ManufacturerLogo({
  manufacturer,
  interactive,
}: {
  manufacturer: ManufacturerMarqueeItem
  interactive: boolean
}) {
  return (
    <Link
      href={`/fabricantes/${manufacturer.slug}`}
      className="manufacturers-marquee__logo"
      tabIndex={interactive ? 0 : -1}
      aria-hidden={interactive ? undefined : true}
      aria-label={interactive ? manufacturer.label : undefined}
      title={manufacturer.label}
    >
      {manufacturer.image ? (
        manufacturer.image.remote ? (
          // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que EntityImage: dominio remoto no configurado en next.config.js
          <img
            src={manufacturer.image.src}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Image
            src={manufacturer.image.src}
            alt=""
            width={112}
            height={40}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        )
      ) : (
        <span className="text-center text-xs font-semibold leading-tight text-neutral-500">
          {manufacturer.label}
        </span>
      )}
    </Link>
  )
}

/**
 * Marquee horizontal de los 75 fabricantes documentados (panel 2.5 de la
 * home, junto a Categorías). Loop CSS puro (`globals.css`, capítulo 2.2):
 * este componente solo arma el markup — duplica el track una vez para que
 * `translateX(-50%)` sea continuo — y expone el control de pausa manual
 * vía `data-paused` (la animación además ya se pausa con `:hover`, pero
 * hover no existe en touch, así que el botón es el único control real en
 * mobile).
 *
 * `prefers-reduced-motion` no se detecta acá en JS: `globals.css` ya
 * apaga la animación y convierte el track en grid con wrap por su cuenta
 * (mismo elemento, sin remontar nada), así que no hace falta duplicar esa
 * lógica en el componente — ver el bloque `@media` correspondiente.
 */
export function ManufacturersMarquee({ manufacturers, className }: ManufacturersMarqueeProps) {
  const [paused, setPaused] = useState(false)
  const headingId = useId()

  const togglePaused = useCallback(() => setPaused((current) => !current), [])

  if (manufacturers.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-4">
        <p id={headingId} className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
          {manufacturers.length} fabricantes documentados
        </p>
        <button
          type="button"
          onClick={togglePaused}
          aria-pressed={paused}
          aria-label={paused ? 'Reanudar el desplazamiento de fabricantes' : 'Pausar el desplazamiento de fabricantes'}
          className="manufacturers-marquee__pause-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-edge text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
        >
          {paused ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          )}
        </button>
      </div>

      <div
        className="manufacturers-marquee"
        role="group"
        aria-labelledby={headingId}
        data-paused={paused}
      >
        <div className="manufacturers-marquee__viewport">
          <div className="manufacturers-marquee__track">
            {manufacturers.map((manufacturer) => (
              <ManufacturerLogo key={`orig-${manufacturer.slug}`} manufacturer={manufacturer} interactive />
            ))}
          </div>
          <div className="manufacturers-marquee__track manufacturers-marquee__track--clone" aria-hidden="true">
            {manufacturers.map((manufacturer) => (
              <ManufacturerLogo key={`clone-${manufacturer.slug}`} manufacturer={manufacturer} interactive={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
