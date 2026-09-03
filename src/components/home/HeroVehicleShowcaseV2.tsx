'use client'

import { useRef, useState, useEffect, useCallback, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HeroPromoBanner, type HeroPromoBannerItem } from '@/components/home/HeroPromoBanner'
import { FeaturedCarousel } from '@/components/home/FeaturedCarousel'
import { FLIP_VIEW_TRANSITION_NAME, navigateWithFlip, supportsViewTransitions } from '@/lib/view-transitions'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'

/**
 * Ítem del carrusel derecho (same as before).
 */
export interface HeroVehicleShowcaseItem {
  slug: string
  title: string
  manufacturer?: string
  src: string
  alt: string
  categoryHref?: string | null
  detailHref: string
  powerLabel?: string | null
  secondaryStatLabel?: string | null
  evidenceLevel?: EvidenceLevel
}

const PHOTO_ZOOM_SCALE = 1.3
const SCROLL_STEP_PX = 360

interface HeroVehicleShowcaseV2Props {
  vehicles: HeroVehicleShowcaseItem[]
  promoBannerItem: HeroPromoBannerItem | null
  className?: string
}

/**
 * REDISEÑO COMPLETO — "FRANJA 100% HORIZONTAL CON DOS BLOQUES" (sept. 2026).
 *
 * Nueva estructura de hero:
 * 1. Elimina la foto flotante/superpuesta anterior
 * 2. Crea una franja 100% horizontal (edge-to-edge, mín. padding)
 * 3. Divide en dos bloques lado a lado:
 *    - IZQUIERDA (50%): HeroPromoBanner (tarjeta promocional grande, un único item fijo)
 *    - DERECHA (50%): FeaturedCarousel (carrusel de 4+ vehículos con flechas)
 * 4. Mobile/tablet: se apilan verticalmente (columna)
 *
 * Ambos bloques:
 * - Son 100% clickeables y funcionales
 * - Mantienen el mismo lenguaje visual (hero-glow-card, hover effects)
 * - Tienen especificaciones y nivel de evidencia visible
 * - Responden a interacción del usuario (flechas, click, transición FLIP)
 *
 * Desktop: lado a lado, altura uniforme
 * Mobile: apilados, altura auto (foto + detalles fluye naturalmente)
 */
export function HeroVehicleShowcaseV2({ vehicles, promoBannerItem, className }: HeroVehicleShowcaseV2Props) {
  const router = useRouter()
  const trackRef = useRef<HTMLDivElement>(null)
  const [flipSupported, setFlipSupported] = useState(false)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  useEffect(() => {
    setFlipSupported(supportsViewTransitions())
  }, [])

  const updateScrollButtons = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setCanScrollPrev(track.scrollLeft > 4)
    setCanScrollNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    updateScrollButtons()
    track.addEventListener('scroll', updateScrollButtons, { passive: true })
    window.addEventListener('resize', updateScrollButtons)
    return () => {
      track.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [updateScrollButtons, vehicles.length])

  function scrollByStep(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({
      left: SCROLL_STEP_PX * direction,
      behavior: 'smooth',
    })
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* Franja principal: dos bloques lado a lado (o apilados en mobile) */}
      <div className="flex flex-col gap-4 px-3 sm:px-4 lg:flex-row lg:gap-4">
        {/* BLOQUE IZQUIERDO: Anuncio promocional fijo */}
        <div className="flex w-full flex-shrink-0 lg:w-1/2">
          <HeroPromoBanner item={promoBannerItem} />
        </div>

        {/* BLOQUE DERECHO: Carrusel de vehículos destacados */}
        <section className="relative flex w-full flex-col gap-3 lg:w-1/2" aria-label="Vehículos destacados">
          {/* Track del carrusel con snap y scroll suave */}
          <div
            ref={trackRef}
            className="hide-scrollbar group relative flex gap-3 overflow-x-auto scroll-smooth"
          >
            <FeaturedCarousel trackRef={trackRef} onScroll={updateScrollButtons}>
              {vehicles.map((vehicle, index) => {
                const flipEnabled =
                  flipSupported && !matchMedia('(prefers-reduced-motion: reduce)').matches && vehicle.categoryHref

                const imageNode = (
                  <div className="relative h-full w-full overflow-hidden bg-white/5">
                    <Image
                      src={vehicle.src}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="(min-width: 1024px) 25vw, 33vw"
                      priority={index === 0}
                      className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                      style={{ transform: `scale(${PHOTO_ZOOM_SCALE})` } as CSSProperties}
                    />
                  </div>
                )

                const canLink = Boolean(vehicle.categoryHref)

                return (
                  <div
                    key={vehicle.slug}
                    className="hero-glow-card hero-card-hover animate-fade-in group/card relative h-[21rem] w-[19rem] shrink-0 snap-start overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 shadow-lg sm:h-[23rem] sm:w-[26rem] lg:w-[30rem]"
                    style={{ animationDelay: `${index * 90}ms`, animationFillMode: 'backwards' }}
                  >
                    {canLink ? (
                      <Link
                        href={vehicle.categoryHref as string}
                        aria-label={`Ver ${vehicle.manufacturer ? `${vehicle.manufacturer} ` : ''}${vehicle.title} en su categoría`}
                        className="block h-full w-full tap-scale focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-auto-accent"
                        onClick={
                          flipEnabled
                            ? (e) => {
                                e.preventDefault()
                                navigateWithFlip((href) => router.push(href), vehicle.categoryHref as string, vehicle.slug)
                              }
                            : undefined
                        }
                      >
                        {imageNode}
                      </Link>
                    ) : (
                      imageNode
                    )}

                    {/* Sello de evidencia */}
                    {vehicle.evidenceLevel && (
                      <span
                        className={cn(
                          'pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide shadow-sm backdrop-blur-sm',
                          EVIDENCE_STAMP_META[vehicle.evidenceLevel].className
                        )}
                        title="Nivel de evidencia — ver detalle completo en la ficha"
                      >
                        <span aria-hidden="true">{EVIDENCE_STAMP_META[vehicle.evidenceLevel].icon}</span>
                        {EVIDENCE_STAMP_META[vehicle.evidenceLevel].shortLabel}
                      </span>
                    )}

                    {/* Chip de specs */}
                    {(vehicle.powerLabel || vehicle.secondaryStatLabel) && (
                      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-stretch overflow-hidden rounded-2xl border border-edge-strong bg-white/95 shadow-xl backdrop-blur-md">
                        {vehicle.powerLabel && (
                          <div className="flex items-center gap-2 px-3 py-2.5">
                            <span
                              aria-hidden="true"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-auto-accent/15 text-auto-accent"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M13 2 3 14h7l-1 8 11-14h-7l0-6z" />
                              </svg>
                            </span>
                            <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-neutral-900">
                              {vehicle.powerLabel}
                            </span>
                          </div>
                        )}

                        {vehicle.powerLabel && vehicle.secondaryStatLabel && (
                          <span aria-hidden="true" className="my-2 w-px bg-edge-strong" />
                        )}

                        {vehicle.secondaryStatLabel && (
                          <div className="flex items-center gap-2 px-3 py-2.5">
                            <span
                              aria-hidden="true"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-auto-accent-orange/15 text-auto-accent-orange"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20.59 13.41 12 22l-9-9V3h10l7.59 8.41a2 2 0 0 1 0 2.18Z" />
                                <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                              </svg>
                            </span>
                            <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-neutral-900">
                              {vehicle.secondaryStatLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CTA: Ver ficha */}
                    <Link
                      href={vehicle.detailHref}
                      aria-label={`Ver ficha completa de ${vehicle.manufacturer ? `${vehicle.manufacturer} ` : ''}${vehicle.title}`}
                      className="cta-shine group/cta tap-scale absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-neutral-900/20 ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-1 hover:bg-black hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
                    >
                      Ver ficha
                      <span
                        aria-hidden="true"
                        className="text-auto-accent-strong transition-transform duration-200 group-hover/cta:translate-x-0.5"
                      >
                        →
                      </span>
                    </Link>
                  </div>
                )
              })}
            </FeaturedCarousel>

            {/* Botones de navegación (solo desktop) */}
            {vehicles.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollByStep(-1)}
                  disabled={!canScrollPrev}
                  aria-label="Ver vehículos anteriores"
                  className="tap-scale absolute -left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-700 shadow-lg ring-1 ring-neutral-200 transition-all duration-150 hover:-translate-x-0.5 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent sm:flex"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollByStep(1)}
                  disabled={!canScrollNext}
                  aria-label="Ver más vehículos"
                  className="tap-scale absolute -right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-700 shadow-lg ring-1 ring-neutral-200 transition-all duration-150 hover:translate-x-0.5 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent sm:flex"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
