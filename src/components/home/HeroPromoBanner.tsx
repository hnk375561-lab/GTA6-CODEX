'use client'

import Link from 'next/link'
import Image from 'next/image'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'

/**
 * Ítem único de anuncio propio del hero — tarjeta promocional grande,
 * 100% clickeable, sin rotación ni navegación interna.
 */
export interface HeroPromoBannerItem {
  /** Etiqueta corta arriba del título (ej. "Por qué elegir un sedán"). */
  eyebrow: string
  /** Título del vehículo recomendado (ej. "Toyota Corolla"). */
  headline: string
  /** Descripción o detalle adicional (opcional). */
  description?: string | null
  /** Imagen principal — resuelta en servidor (`resolveEntityDisplayImage`). */
  src: string
  alt: string
  /** Destino único de click — ficha completa del vehículo. */
  detailHref: string
  /** Potencia ya formateada (ej. "201 hp"). */
  powerLabel?: string | null
  /** Precio en USD formateado o velocidad máxima como respaldo. */
  secondaryStatLabel?: string | null
  /** Nivel de evidencia de la ficha. */
  evidenceLevel?: EvidenceLevel
}

interface HeroPromoBannerProps {
  item: HeroPromoBannerItem | null
  className?: string
}

/**
 * REDISEÑO V3 — "TARJETA VERTICAL, COLUMNA ANGOSTA" (sept. 2026).
 *
 * Reemplaza el bloque izquierdo anterior (`HeroSelfPromoCard`) con una
 * tarjeta grande y prominente:
 *
 * Layout: SIEMPRE una columna (foto arriba, detalles abajo), en todos los
 * tamaños de pantalla. Antes (V2) este banner dividía 50/50 foto/texto en
 * desktop porque ocupaba la mitad de la franja del hero; ahora
 * `HeroVehicleShowcaseV2` lo aloja en una columna angosta de ancho fijo
 * (≈320-360px) para dejarle todo el resto del ancho al carrusel de la
 * derecha — dentro de una columna así de angosta, partir la tarjeta en
 * dos mitades laterales la dejaba con la foto y el texto aplastados. El
 * formato vertical (más alto que ancho) es además el que mejor lee en una
 * columna angosta.
 *
 * Características:
 * - Clickeable en su totalidad — el `<Link>` rodea foto + detalles
 * - Un solo click real (no dos puntos como antes)
 * - Gradiente oscuro de fondo para que destaque en la franja
 * - Sello de evidencia en la esquina superior izquierda
 * - Chip de specs (potencia + precio) en la esquina inferior izquierda de la foto
 * - CTA grande al final del detalles (ej. "Ver ficha completa →")
 * - Animación de entrada suave (`animate-fade-in`)
 *
 * PULIDO FINAL — alto parejo con el carrusel (sept. 2026): en `lg`,
 * `HeroVehicleShowcaseV2` le da a esta tarjeta un alto fijo (`h-full`
 * sobre `lg:h-[23rem]`, igual que las cards del carrusel) para que ambos
 * bloques de la franja midan lo mismo. Adentro, la foto pasa a
 * `lg:flex-1 lg:min-h-0` (ocupa lo que sobra después del texto, en vez de
 * imponer su propio mínimo fijo) y el bloque de texto pasa a
 * `lg:flex-none` con `line-clamp-2` en título y descripción — así el
 * contenido nunca empuja la tarjeta más allá del alto fijo compartido.
 * Por debajo de `lg` (banner apilado a ancho completo, sin alto forzado)
 * el comportamiento no cambia.
 */
export function HeroPromoBanner({ item, className }: HeroPromoBannerProps) {
  const containerClassName = cn(
    'relative w-full overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-900 text-white shadow-lg hero-glow-card',
    className
  )

  // Fallback cuando no hay ítem disponible
  if (!item) {
    return (
      <div aria-label="Anuncio destacado" className={containerClassName}>
        <div className="flex h-full min-h-[26rem] flex-col justify-end bg-gradient-to-br from-neutral-800 via-neutral-900 to-black p-8 lg:min-h-0">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
            Descubrí el catálogo
          </p>
          <p className="mt-4 font-display text-3xl font-bold leading-tight">
            Fichas técnicas reales
          </p>
          <p className="mt-2 max-w-sm text-sm text-neutral-300">
            Especificaciones de fabricante con fuentes citadas — compará antes de decidir.
          </p>
          <Link
            href="/vehiculos"
            className="cta-shine tap-scale mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Explorar todos <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={item.detailHref}
      aria-label={`Ver ficha de ${item.headline}`}
      className={cn(containerClassName, 'hero-card-hover tap-scale animate-fade-in group flex flex-col gap-0 transition-colors duration-150 hover:border-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent')}
    >
      {/* ARRIBA: Foto + sello de evidencia + specs */}
      <div className="relative flex min-h-64 w-full overflow-hidden bg-white/5 sm:min-h-72 lg:min-h-0 lg:flex-1">
        <Image
          src={item.src}
          alt=""
          aria-hidden="true"
          fill
          sizes="(min-width: 1024px) 360px, 100vw"
          priority
          className="object-cover"
        />

        {/* Sello de evidencia — esquina superior izquierda */}
        {item.evidenceLevel && (
          <span
            className={cn(
              'pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide shadow-sm backdrop-blur-sm',
              EVIDENCE_STAMP_META[item.evidenceLevel].className
            )}
            title="Nivel de evidencia — ver detalle en la ficha"
          >
            <span aria-hidden="true">{EVIDENCE_STAMP_META[item.evidenceLevel].icon}</span>
            {EVIDENCE_STAMP_META[item.evidenceLevel].shortLabel}
          </span>
        )}

        {/* Chip de specs — esquina inferior izquierda */}
        {(item.powerLabel || item.secondaryStatLabel) && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-stretch gap-2 overflow-hidden rounded-2xl border border-edge-strong bg-white/95 shadow-xl backdrop-blur-md">
            {item.powerLabel && (
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-auto-accent/15 text-auto-accent"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2 3 14h7l-1 8 11-14h-7l0-6z" />
                  </svg>
                </span>
                <span className="whitespace-nowrap font-mono text-xs font-semibold text-neutral-900">
                  {item.powerLabel}
                </span>
              </div>
            )}

            {item.powerLabel && item.secondaryStatLabel && (
              <span aria-hidden="true" className="my-2 w-px bg-edge-strong" />
            )}

            {item.secondaryStatLabel && (
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-auto-accent-orange/15 text-auto-accent-orange"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41 12 22l-9-9V3h10l7.59 8.41a2 2 0 0 1 0 2.18Z" />
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <span className="whitespace-nowrap font-mono text-xs font-semibold text-neutral-900">
                  {item.secondaryStatLabel}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ABAJO: Detalles + CTA */}
      <div className="flex w-full flex-1 flex-col justify-between gap-4 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black p-6 sm:p-8 lg:flex-none lg:gap-3 lg:overflow-hidden lg:p-6">
        {/* Eyebrow + Título + Descripción */}
        <div className="flex flex-col gap-3 lg:gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
            {item.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl lg:line-clamp-2 lg:text-2xl">
            {item.headline}
          </h2>
          {item.description && (
            <p className="line-clamp-2 max-w-sm text-sm leading-relaxed text-neutral-300">
              {item.description}
            </p>
          )}
        </div>

        {/* CTA grande */}
        <div className="flex items-center gap-2 pt-2 text-white/40 transition-all duration-150 group-hover:text-white">
          <span className="font-semibold">Ver ficha completa</span>
          <span aria-hidden="true" className="text-lg">→</span>
        </div>
      </div>
    </Link>
  )
}
