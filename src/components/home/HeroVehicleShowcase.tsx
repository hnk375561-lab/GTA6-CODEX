'use client'

import { useRef, useState, useEffect, useCallback, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HeroSelfPromoCard, type HeroSelfPromoContent } from '@/components/home/HeroSelfPromoCard'
import { FeaturedCarousel } from '@/components/home/FeaturedCarousel'
import { FLIP_VIEW_TRANSITION_NAME, navigateWithFlip, supportsViewTransitions } from '@/lib/view-transitions'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'

/**
 * Ítem ya resuelto en servidor: `resolveEntityDisplayImage` depende de
 * `fs` (ver `EntityImage.tsx`), así que este componente cliente nunca
 * resuelve la imagen por sí mismo — el caller (`src/app/page.tsx`) arma
 * este array con 3–4 vehículos `featured` que sí tengan foto real.
 */
export interface HeroVehicleShowcaseItem {
  slug: string
  title: string
  manufacturer?: string
  src: string
  alt: string
  /** URL de `/categorias/[grupo]` para este vehículo (ver
   *  `categoryPageHref` en `lib/vehicle-category.ts`), o `null`/
   *  `undefined` si no tiene categoría con página SEO propia. Sin href,
   *  la foto se comporta como puramente decorativa, sin click. Con
   *  href, habilita la navegación y — cuando el navegador lo soporta y
   *  no hay `prefers-reduced-motion` — la transición FLIP experimental
   *  hacia la card correspondiente en Categorías (ver
   *  `lib/view-transitions.ts`). */
  categoryHref?: string | null
  /** URL de la ficha completa del vehículo (`/vehiculos/[slug]`) —
   *  segundo punto de click real sobre la pieza (ver "chip" más abajo),
   *  hermano del click sobre la foto (que va a `categoryHref`) — nunca
   *  un `<Link>` anidado dentro de otro. */
  detailHref: string
  /** Etiqueta corta ya formateada ("201 hp") derivada de `parsePowerHp`
   *  en el caller — este componente nunca parsea texto libre por su
   *  cuenta. `null` cuando el vehículo no tiene potencia parseable. */
  powerLabel?: string | null
  /** Segundo dato destacado: precio en USD ya formateado, o la velocidad
   *  máxima (texto ya humano, ej. "241 km/h") como respaldo. `null` si no
   *  hay ninguno de los dos. */
  secondaryStatLabel?: string | null
  /** Nivel de evidencia real de la ficha (`vehicle.evidence.level`). */
  evidenceLevel?: EvidenceLevel
}

/**
 * Factor de zoom aplicado a cada foto (las fotos reales de prensa/ficha
 * oficial traen mucho margen blanco propio alrededor del vehículo — con
 * `object-contain` puro ese margen se leía como espacio muerto). En vez
 * de recortar cada asset a mano, se escala la imagen ya encajada dentro
 * de un contenedor propio con `overflow-hidden`.
 */
const PHOTO_ZOOM_SCALE = 1.3

/** Calcula el paso de scroll dinámicamente basado en el ancho real de una card
 *  (incluye gap). Fallback a 360px si el track no está listo. */
function getScrollStep(track: HTMLDivElement | null): number {
  if (!track) return 360
  return Math.max(280, Math.round(track.clientWidth * 0.85))
}

interface HeroVehicleShowcaseProps {
  vehicles: HeroVehicleShowcaseItem[]
  /** Ítems del bloque izquierdo (ver `HeroSelfPromoCard`) — QUINTO
   *  REDISEÑO (sept. 2026): 2-3 ítems fijos, todos visibles a la vez, sin
   *  rotación ni flechas propias (ver docstring de ese componente para
   *  el detalle completo del cambio). Array vacío cuando `page.tsx` no
   *  encontró ningún vehículo con foto resuelta para armar ni un ítem
   *  (cae al fallback genérico del componente). */
  selfPromoItems: HeroSelfPromoContent[]
  className?: string
}

/**
 * QUINTO REDISEÑO — "DOS BLOQUES, EDGE-TO-EDGE DE VERDAD" (sept. 2026).
 *
 * Reconstruida desde cero sobre la base del rediseño anterior (mismo
 * concepto de fondo: dos bloques lado a lado, izquierda anuncio propio,
 * derecha carrusel de vehículos), con dos correcciones explícitas
 * pedidas tras probarlo:
 *
 * 1) "NO ME GUSTA LA FORMA EN QUE SE EJECUTA" — el bloque izquierdo
 *    (`HeroSelfPromoCard`) dejó de navegarse a mano (flechas/dots/swipe,
 *    `'use client'` con estado) y ahora muestra 2-3 recomendaciones A LA
 *    VEZ, sin nada para tocar ni esperar — ver el docstring largo de ese
 *    componente para el detalle de por qué esto también es más robusto
 *    (un solo click por fila, sin superficie para que un handler de
 *    swipe vuelva a robarle el click a un `<Link>`).
 * 2) "QUIERO QUE SEA MÁS HORIZONTAL, 100% SI SE PUEDE" — el padding
 *    lateral del wrapper full-bleed baja de hasta `xl:px-12` (3rem) a un
 *    margen fijo y chico (`px-3 sm:px-4`), así la franja queda
 *    verdaderamente de borde a borde del viewport en vez de sentirse
 *    "casi ancho" — el único motivo para no ir a `px-0` literal es que
 *    las cards tienen esquinas redondeadas (`rounded-3xl`): a cero
 *    padding esas esquinas quedarían cortadas exactamente en el borde
 *    físico de la pantalla, que se lee como error de recorte, no como
 *    diseño "ancho".
 *
 * Se mantiene sin cambios respecto de la versión anterior: el carrusel
 * de la derecha (`FeaturedCarousel`, mismo drag+snap+flechas, mismo fix
 * de click-through con mouse — ver ese archivo), overlay de sello de
 * evidencia + specs + chip "Ver ficha" por card, transición FLIP
 * opcional hacia Categorías, `prefers-reduced-motion`, y accesibilidad
 * (imagen decorativa `aria-hidden` + `aria-label` real en cada `<Link>`).
 * En mobile/tablet (`< lg`) los dos bloques se apilan en columna
 * (anuncio arriba, carrusel abajo) — "izquierda/derecha" es un concepto
 * de desktop.
 */
export function HeroVehicleShowcase({ vehicles, selfPromoItems, className }: HeroVehicleShowcaseProps) {
  const router = useRouter()
  const trackRef = useRef<HTMLDivElement>(null)
  const [flipSupported, setFlipSupported] = useState(false)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  // Soporte de View Transitions: se resuelve una sola vez en cliente (no
  // cambia durante la sesión) — evita evaluar como `true` en el primer
  // render de servidor/hidratación, donde `document.startViewTransition`
  // todavía no es chequeable.
  useEffect(() => {
    setFlipSupported(supportsViewTransitions())
  }, [])

  // Habilita/deshabilita visualmente las flechas según si queda algo
  // para scrollear en cada dirección — se recalcula en cada evento de
  // scroll del track (drag, swipe, flecha, rueda) y una vez al montar.
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
    trackRef.current?.scrollBy({ left: getScrollStep(trackRef.current) * direction, behavior: 'smooth' })
  }

  return (
    // Full-bleed edge-to-edge: escapa del `max-w` centrado del panel hero
    // (`w-screen` + `-ml-[50vw]`) con un margen lateral fijo y chico —
    // ver el punto 2 del docstring de arriba para por qué no es `px-0`.
    <div className={cn('relative left-1/2 w-screen -ml-[50vw] px-3 sm:px-4', className)}>
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* IZQUIERDA: anuncio propio — bloque fijo, 2-3 ítems visibles a
            la vez (ver `HeroSelfPromoCard`), sin navegación propia. */}
        <HeroSelfPromoCard
          items={selfPromoItems}
          className="h-[22rem] shrink-0 sm:h-[24rem] lg:h-auto lg:w-[22rem] xl:w-[25rem]"
        />

        {/* DERECHA: carrusel de vehículos, en su propio bloque con todo
            el ancho restante para él solo. Envuelto en `<section>` con
            `aria-label` propio (pulido final: mismo criterio semántico
            que el `<aside>` de la izquierda, ver `HeroSelfPromoCard`) —
            dos regiones nombradas para lectores de pantalla en vez de
            dos `<div>` genéricos. El encabezado "Destacados" vive FUERA
            del contenedor `relative` que envuelve flechas+track: esas
            flechas se centran con `top-1/2` respecto de ESE contenedor
            (ver más abajo), así que si el label viviera adentro,
            correrían el centro vertical hacia abajo, desalineadas
            respecto de las cards. */}
        <section aria-label="Vehículos destacados" className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2.5 flex items-center gap-1.5 px-1">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-400">
              <path d="M13 2 3 14h7l-1 8 11-14h-7l0-6z" />
            </svg>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Destacados
            </span>
          </div>
          <div className="relative min-w-0 flex-1">
          <FeaturedCarousel ref={trackRef} className="scroll-px-1 pb-3 pr-1">
            {vehicles.map((vehicle, index) => {
              const canLink = Boolean(vehicle.categoryHref)
              const flipEnabled = canLink && flipSupported

              const imageNode = (
                <div aria-hidden="true" className="hero-vehicle-float absolute inset-0 overflow-hidden">
                  {/* Zoom base vía variable CSS (`--hero-photo-zoom`, ver
                      `.hero-vehicle-photo` en `globals.css`) en vez de
                      `transform` inline directo — así el zoom extra al
                      hover (`.group:hover &`, definido en CSS) puede
                      subir la escala sin competir con nada puesto por
                      React en el mismo `style`. */}
                  <Image
                    src={vehicle.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 30rem, (min-width: 640px) 26rem, 78vw"
                    // `priority` solo en la primera card: es el
                    // candidato más probable a LCP de todo el hero (la
                    // foto más grande arriba del pliegue) — el resto
                    // sigue con lazy-loading por defecto.
                    priority={index === 0}
                    className="hero-vehicle-photo object-contain drop-shadow-xl"
                    style={{
                      '--hero-photo-zoom': PHOTO_ZOOM_SCALE,
                      viewTransitionName: flipEnabled ? FLIP_VIEW_TRANSITION_NAME : undefined,
                    } as CSSProperties}
                  />
                </div>
              )

              return (
                <div
                  key={vehicle.slug}
                  className="hero-glow-card hero-card-hover animate-fade-in group relative h-[21rem] w-[19rem] shrink-0 snap-start snap-stop-always overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 shadow-lg sm:h-[23rem] sm:w-[26rem] lg:w-[28rem]"
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

                  {/* Sello de evidencia — mismo componente visual que ya
                      usa `EntityCard` sobre sus fotos, mismo criterio de
                      color por nivel. */}
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

                  {/* Tarjeta de specs unificada: potencia y precio/velocidad
                      juntos en una sola pieza con ícono. */}
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

                  {/* Chip "Ver ficha →": CTA sólido, fondo oscuro con
                      contraste real — segundo punto de click real sobre
                      la card, hermano del `<Link>` de categoría de
                      arriba (nunca anidado). */}
                  <Link
                    href={vehicle.detailHref}
                    aria-label={`Ver ficha completa de ${vehicle.manufacturer ? `${vehicle.manufacturer} ` : ''}${vehicle.title}`}
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
          </FeaturedCarousel>

          {/* Flechas prev/next reales — mueven el mismo nodo que ya
              scrollea con drag/swipe (`trackRef`, expuesto por
              `FeaturedCarousel`), nunca un segundo estado de "índice
              actual" separado. Ocultas en mobile (el gesto de swipe ya
              cubre esa navegación en pantallas chicas); visibles desde
              `sm:`. Deshabilitadas (no ocultas) en el extremo
              correspondiente del recorrido. */}
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
          </div>
        </section>
      </div>
    </div>
  )
}
