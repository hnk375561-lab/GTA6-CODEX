'use client'

import { useRef, useState, useEffect, useCallback, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HeroPromoBanner, type HeroPromoBannerItem } from '@/components/home/HeroPromoBanner'
import { FeaturedCarousel } from '@/components/home/FeaturedCarousel'
import { navigateWithFlip, supportsViewTransitions } from '@/lib/view-transitions'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn, formatVehicleDisplayName } from '@/lib/utils'

/**
 * Ítem del carrusel derecho (sin cambios de forma respecto de versiones
 * anteriores).
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

/** Calcula el paso de scroll dinámicamente basado en el ancho real de una card
 *  (incluye gap). El track expone su scrollWidth/clientWidth, así que el paso
 *  ideal es ~ancho visible del track * 0.85 (deja ~15% de la siguiente card
 *  asomando como pista visual). Fallback a 360px si el track no está listo. */
function getScrollStep(track: HTMLDivElement | null): number {
  if (!track) return 360
  return Math.max(280, Math.round(track.clientWidth * 0.85))
}

interface HeroVehicleShowcaseV2Props {
  vehicles: HeroVehicleShowcaseItem[]
  promoBannerItem: HeroPromoBannerItem | null
  className?: string
}

/**
 * REDISEÑO V3 — "FRANJA HORIZONTAL, CARRUSEL AL ANCHO REAL" (sept. 2026).
 *
 * Qué cambia respecto de la V2 anterior:
 *
 * 1. FIX del build roto (`error TS2322: Property 'trackRef' does not
 *    exist...`): la V2 le pasaba `trackRef` y `onScroll` como props a
 *    `<FeaturedCarousel>`, que nunca los declaró en su interfaz — ese
 *    componente ya expone su propio nodo scrolleable vía `forwardRef`
 *    (ver `FeaturedCarousel.tsx`), no vía props custom. Antes, además, la
 *    V2 envolvía `<FeaturedCarousel>` (que ya es scrolleable por dentro,
 *    con su propio `overflow-x-auto` + drag por puntero) dentro de OTRO
 *    div con `overflow-x-auto` propio y su propio listener de scroll —
 *    dos contenedores de scroll anidados en el mismo eje, compitiendo por
 *    el mismo gesto. Eso es exactamente el patrón que el propio
 *    `FeaturedCarousel.tsx` advierte evitar en sus comentarios, y es la
 *    causa más probable de que ni las cards ni las flechas respondieran
 *    al click: el contenedor externo capturaba el scroll/puntero antes de
 *    que llegara al `<Link>`/`<button>` real de adentro.
 *    Ahora `<FeaturedCarousel ref={trackRef}>` es EL único contenedor
 *    scrolleable — sin wrapper duplicado — y las flechas prev/next llaman
 *    `trackRef.current.scrollBy(...)` sobre ese mismo nodo real.
 *
 * 2. Proporción izquierda/derecha: la V2 dividía 50/50, lo que dejaba el
 *    carrusel angosto (apenas 1–1.5 cards visibles) y no se sentía "una
 *    franja horizontal". Ahora el bloque de anuncio propio es una columna
 *    angosta de ancho fijo (`lg:w-[320px] xl:w-[360px]`) y el carrusel
 *    ocupa TODO el resto del ancho disponible (`flex-1`) — en pantallas
 *    anchas se ven 3-4 cards completas más el inicio de la siguiente, en
 *    vez de una columna recortada.
 *
 * Mobile/tablet (< lg): se apilan verticalmente — anuncio arriba,
 * carrusel abajo, cada uno a 100% del ancho.
 *
 * REDISEÑO V4 — PULIDO FINAL (sept. 2026): visual + responsive + a11y.
 *
 * - Alto parejo entre los dos bloques en desktop: antes cada bloque tenía
 *   su alto "natural" (el banner, con foto + eyebrow + título + descripción
 *   + CTA apilados, terminaba bastante más alto que las cards del
 *   carrusel — ~470-500px contra los 23rem/368px de las cards), así que
 *   la fila quedaba desalineada y con aire de sobra debajo del carrusel.
 *   Ahora la fila fuerza `lg:h-[23rem]` (mismo alto que las cards, que ya
 *   usan `sm:h-[23rem]` y no tienen override propio en `lg`), y adentro
 *   del banner la foto pasa a `lg:flex-1` (ocupa lo que sobra) mientras el
 *   bloque de texto usa `line-clamp` en título/descripción para no
 *   desbordar ese alto fijo — ver el detalle en `HeroPromoBanner.tsx`.
 * - Fade de scroll: un degradé sutil en el borde derecho del carrusel
 *   (visible solo mientras `canScrollNext` es true) señala que hay más
 *   contenido para scrollear sin depender únicamente de las flechas.
 * - Accesibilidad: el nombre accesible de la región ("Vehículos
 *   destacados") se movió del `<section>` envolvente al propio track de
 *   `FeaturedCarousel` (vía su nuevo prop `ariaLabel`), que es el
 *   elemento que realmente scrollea — así un lector de pantalla anuncia
 *   "región, carrusel, Vehículos destacados" sobre el contenedor
 *   correcto. `FeaturedCarousel` también ganó soporte de flechas de
 *   teclado (`ArrowLeft`/`ArrowRight`) para quien navegue sin mouse ni
 *   touch — ver el detalle en `FeaturedCarousel.tsx`.
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

  // El track real vive DENTRO de `FeaturedCarousel` (expuesto vía
  // `forwardRef`), así que el listener de scroll se engancha directo a
  // ese nodo — no a un wrapper propio — para no crear un segundo
  // contenedor de scroll como en la V2.
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
      left: getScrollStep(track) * direction,
      behavior: 'smooth',
    })
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* Franja principal: anuncio angosto a la izquierda + carrusel al
          ancho real a la derecha (o apilados en mobile/tablet). `lg:h-*`
          fuerza el mismo alto en ambos bloques — ver nota "Alto parejo"
          arriba. */}
      <div className="flex w-full flex-col gap-4 px-3 sm:px-4 lg:h-[23rem] lg:flex-row lg:items-stretch lg:gap-5">
        {/* BLOQUE IZQUIERDO: anuncio promocional fijo, columna angosta */}
        <div className="flex w-full flex-shrink-0 lg:h-full lg:w-[320px] xl:w-[360px]">
          <HeroPromoBanner item={promoBannerItem} className="h-full w-full" />
        </div>

        {/* BLOQUE DERECHO: carrusel de vehículos destacados, ocupa todo
            el ancho restante de la franja */}
        <section className="relative min-w-0 flex-1 lg:h-full">
          <FeaturedCarousel ref={trackRef} ariaLabel="Vehículos destacados" className="h-full scroll-smooth">
            {vehicles.map((vehicle, index) => {
              const flipEnabled =
                flipSupported && !matchMedia('(prefers-reduced-motion: reduce)').matches && vehicle.categoryHref

              const imageNode = (
                // El wrapper panea la foto dentro del recorte al hacer
                // hover (`.hero-card-media`, ver globals.css): la cámara
                // "sube" 3% en vez de hacer un zoom genérico. El crop fijo
                // sigue en el Image (`PHOTO_ZOOM_SCALE`, compensa `sizes`)
                // y siempre gana el transform inline sobre clases — por eso
                // el antiguo `group-hover/card:scale-110` de Tailwind no
                // hacía nada (código muerto, ver auditoría del hero).
                <div className="hero-card-media relative h-full w-full overflow-hidden bg-white/5">
                  <Image
                    src={vehicle.src}
                    alt=""
                    aria-hidden="true"
                    fill
                    // `sizes` describe la caja CSS de la card, pero la imagen
                    // encima se agranda un PHOTO_ZOOM_SCALE (1.3x) más via
                    // `transform: scale()` — sin compensar acá, next/image
                    // pide una resolución pensada para la caja sin zoomear y
                    // el navegador la termina estirando un 30% extra al
                    // renderizar, perdiendo nitidez visible (reportado: fotos
                    // 4K de origen se ven borrosas en este carrusel puntual).
                    // Se pide ~30% más ancho de source para que, incluso ya
                    // agrandada por el transform, siga siendo 1:1 con los
                    // píxeles reales de pantalla.
                    sizes="(min-width: 1024px) 33vw, 43vw"
                    quality={95}
                    priority={index === 0}
                    className="object-cover"
                    style={{ transform: `scale(${PHOTO_ZOOM_SCALE})` } as CSSProperties}
                  />
                </div>
              )

              const canLink = Boolean(vehicle.categoryHref)

              return (
                <div
                  key={vehicle.slug}
                  className="hero-glow-card hero-card-hover animate-fade-in group/card relative h-[21rem] w-[19rem] shrink-0 snap-start snap-stop-always overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 shadow-lg sm:h-[23rem] sm:w-[26rem] lg:w-[28rem]"
                  style={{ animationDelay: `${index * 90}ms`, animationFillMode: 'backwards' }}
                >
                  {canLink ? (
                    <Link
                      href={vehicle.categoryHref as string}
                      aria-label={`Ver ${formatVehicleDisplayName(vehicle.manufacturer, vehicle.title)} en su categoría`}
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
                    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-stretch overflow-hidden rounded-2xl border border-edge-strong bg-surface-chip shadow-xl backdrop-blur-md">
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
                    aria-label={`Ver ficha completa de ${formatVehicleDisplayName(vehicle.manufacturer, vehicle.title)}`}
                    className="cta-shine group/cta tap-scale absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-inverse px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-black/20 ring-1 ring-white/10 transition duration-200 hover:-translate-y-1 hover:bg-black hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
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

            {/* Espaciador final: aire después de la última card para que
                no quede pegada al borde del degradé de la derecha. */}
            {vehicles.length > 0 && <div aria-hidden="true" className="w-4 shrink-0 sm:w-6" />}
          </FeaturedCarousel>

{/* Degradés de borde: señalan "hay más para scrollear" a cada
              lado sin depender solo de las flechas — se apagan solos
              cuando ya no queda nada para ese lado (mismo estado que
              deshabilita las flechas). `pointer-events-none` para que
              nunca tapen el click de la card de abajo. Ancho aumentado
              para mejor visibilidad (24px base, 48px en sm). */}
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-y-0 left-0 z-[5] w-6 bg-gradient-to-r from-surface-page to-transparent transition-opacity duration-200 sm:w-12',
                canScrollPrev ? 'opacity-100' : 'opacity-0'
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-y-0 right-0 z-[5] w-6 bg-gradient-to-l from-surface-page to-transparent transition-opacity duration-200 sm:w-12',
                canScrollNext ? 'opacity-100' : 'opacity-0'
              )}
            />

          {/* Botones de navegación (solo desktop) — controlan el nodo
              real expuesto por `FeaturedCarousel` vía `trackRef`, sin
              wrapper de scroll intermedio. */}
          {vehicles.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => scrollByStep(-1)}
                disabled={!canScrollPrev}
                aria-label="Ver vehículos anteriores"
                className="tap-scale absolute -left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface-elevated text-auto-text ring-1 ring-edge transition duration-150 hover:-translate-x-0.5 hover:bg-surface-card-hover hover:text-auto-accent-strong disabled:pointer-events-none disabled:opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent sm:flex"
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
                className="tap-scale absolute -right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface-elevated text-auto-text ring-1 ring-edge transition duration-150 hover:translate-x-0.5 hover:bg-surface-card-hover hover:text-auto-accent-strong disabled:pointer-events-none disabled:opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent sm:flex"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
