'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
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
 *
 * Interfaz SIN CAMBIOS respecto de la versión anterior (crossfade):
 * `page.tsx` sigue armando exactamente los mismos campos, el rediseño de
 * abajo es 100% de presentación — ninguna de las líneas que resuelven
 * imagen/potencia/precio/categoría en el server component necesitó
 * tocarse para este cambio.
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
  /** URL de la ficha completa del vehículo (`/vehiculos/[slug]`) — a
   *  diferencia de `categoryHref` (que agrupa por carrocería), este es
   *  el destino específico de ESTE vehículo. Segundo punto de click real
   *  sobre la pieza (ver "chip" más abajo), hermano del click sobre la
   *  foto (que va a `categoryHref`) — nunca un `<Link>` anidado dentro
   *  de otro. */
  detailHref: string
  /** Etiqueta corta ya formateada ("201 hp") derivada de `parsePowerHp`
   *  en el caller — este componente nunca parsea texto libre por su
   *  cuenta. `null` cuando el vehículo no tiene potencia parseable. */
  powerLabel?: string | null
  /** Segundo dato destacado: precio en USD ya formateado si el vehículo
   *  tiene `priceStructured` en esa moneda, o la velocidad máxima (texto
   *  ya humano, ej. "241 km/h") como respaldo — mismo criterio de
   *  prioridad que arma el caller. `null` si no hay ninguno de los dos. */
  secondaryStatLabel?: string | null
  /** Nivel de evidencia real de la ficha (`vehicle.evidence.level`) —
   *  mismo sello compacto que ya usa `EntityCard` sobre sus fotos. */
  evidenceLevel?: EvidenceLevel
}

/**
 * Factor de zoom aplicado a cada foto (las fotos reales de prensa/ficha
 * oficial traen mucho margen blanco propio alrededor del vehículo — con
 * `object-contain` puro ese margen se leía como espacio muerto). En vez
 * de recortar cada asset a mano, se escala la imagen ya encajada dentro
 * de un contenedor propio con `overflow-hidden`: el margen sobrante
 * queda recortado por el contenedor y el vehículo queda más grande y
 * protagonista. Mismo criterio que la versión anterior (crossfade), acá
 * reusado tal cual porque el problema de origen (fotos de prensa con
 * mucho margen) no cambió con el rediseño de presentación.
 */
const PHOTO_ZOOM_SCALE = 1.3

/** Cuánto se desplaza el track por click de flecha — el ancho aprox. de
 *  una card + su gap, así cada click avanza "una card" en vez de un
 *  salto arbitrario. */
const SCROLL_STEP_PX = 360

interface HeroVehicleShowcaseProps {
  vehicles: HeroVehicleShowcaseItem[]
  /** Contenido del bloque izquierdo (ver `HeroSelfPromoCard`) — `null`
   *  cuando `page.tsx` no encontró ningún vehículo con foto resuelta
   *  para armarlo (cae al fallback genérico del componente). */
  selfPromo?: HeroSelfPromoContent | null
  className?: string
}

/**
 * TERCER REDISEÑO — "DOS BLOQUES, 100% HORIZONTAL" (sept. 2026).
 *
 * Motivo del cambio, pedido explícito tras probar el rediseño anterior
 * ("franja showroom", una sola fila con el anuncio propio como primera
 * card del mismo track): dos problemas de fondo, no de detalle.
 *
 * 1) CLICKS ROTOS CON MOUSE. La causa real no era de este archivo sino
 *    de `FeaturedCarousel` (ver el comentario largo ahí): capturaba el
 *    puntero en TODO `pointerdown` de mouse, incluso en un click limpio
 *    sin arrastre, lo que hacía que el `click` sintético se reasignara
 *    al track en vez de al `<Link>`/`<button>` de abajo. Corregido de
 *    raíz en `FeaturedCarousel.tsx` (umbral de movimiento antes de
 *    confirmar arrastre y recién ahí capturar el puntero) — esta pieza
 *    se beneficia automáticamente, sin nada especial que hacer acá.
 * 2) ANCHO REAL. La fila anterior vivía dentro del contenedor centrado
 *    del panel hero (`max-w-[90rem]`, heredado de `page.tsx`) — nunca
 *    llegaba a ocupar el ancho real del viewport, y mezclar el anuncio
 *    propio como "una card más" del mismo track lo hacía perderse entre
 *    los vehículos en vez de leerse como un bloque señalado a propósito.
 *
 * Solución — dos bloques lado a lado, no una fila mezclada:
 * - IZQUIERDA: `HeroSelfPromoCard`, bloque FIJO propio (no forma parte
 *   del scroll del carrusel), marcado con un chip "Nuestra
 *   recomendación" (flecha, ver ese componente) para que se lea como
 *   señalado a propósito, no como una card de catálogo más.
 * - DERECHA: el carrusel de vehículos (`FeaturedCarousel`, mismo
 *   drag+snap+flechas de siempre), ahora en su propio bloque, todo el
 *   ancho restante para él solo.
 * - El contenedor raíz de esta pieza se escapa del `max-width` del
 *   panel hero con la técnica clásica de "full-bleed" (`w-screen` +
 *   `left-1/2` + margen negativo de medio viewport) para que la franja
 *   sea 100% horizontal de verdad — de borde a borde del viewport, con
 *   el mismo padding lateral responsive que el resto del sitio
 *   (`container-max`), nunca tocando el borde físico de la pantalla.
 *   El ancestro que envuelve cada panel del track pineado ya tiene
 *   `overflow: hidden` (`PinnedScrollStages`), así que este escape de
 *   ancho no genera scroll horizontal en la página.
 * - En mobile/tablet (`< lg`) los dos bloques se apilan en columna
 *   (anuncio arriba, carrusel abajo) — "izquierda/derecha" es un
 *   concepto de desktop; en una pantalla angosta no hay espacio real
 *   para dos columnas sin que ambas queden demasiado angostas.
 *
 * Se mantiene sin cambios: todos los vehículos montados a la vez (sin
 * rotación por temporizador), overlay de sello de evidencia + specs +
 * chip "Ver ficha" por card, transición FLIP opcional hacia Categorías
 * (`lib/view-transitions.ts`), `prefers-reduced-motion`, y accesibilidad
 * (imagen decorativa `aria-hidden` + `aria-label` real en cada `<Link>`).
 */
export function HeroVehicleShowcase({ vehicles, selfPromo = null, className }: HeroVehicleShowcaseProps) {
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
  // para scrollear en cada dirección — mismo dato (`scrollLeft`/
  // `scrollWidth`) que ya calcula el navegador para el scroll nativo,
  // solo leído acá para reflejarlo en el estado de las flechas. Se
  // recalcula en cada evento de scroll del track (drag, swipe, flecha,
  // rueda) y una vez al montar.
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
    trackRef.current?.scrollBy({ left: direction * SCROLL_STEP_PX, behavior: 'smooth' })
  }

  return (
    // Full-bleed: escapa del `max-w` centrado del panel hero para que la
    // franja sea 100% horizontal de verdad (borde a borde del viewport,
    // con el mismo padding lateral responsive que `container-max` en el
    // resto del sitio). `className` del caller se agrega al final via
    // `cn`/`twMerge`, así que si algún día hace falta espaciado extra
    // desde `page.tsx` sigue pudiendo pisarse sin tocar este archivo.
    <div className={cn('relative left-1/2 w-screen -ml-[50vw] px-4 sm:px-6 lg:px-8 xl:px-12', className)}>
      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-stretch">
        {/* IZQUIERDA: anuncio propio, bloque fijo — ya no es una card
            más del track de la derecha, ver docstring del componente. */}
        <HeroSelfPromoCard content={selfPromo} className="h-[20rem] w-full shrink-0 sm:h-[22rem] lg:h-auto lg:w-[24rem] xl:w-[27rem]" />

        {/* DERECHA: carrusel de vehículos, en su propio bloque con todo
            el ancho restante para él solo. */}
        <div className="relative min-w-0 flex-1">
      <FeaturedCarousel ref={trackRef} className="scroll-px-1 pb-3 pr-1">
        {vehicles.map((vehicle) => {
          const canLink = Boolean(vehicle.categoryHref)
          const flipEnabled = canLink && flipSupported

          const imageNode = (
            <div aria-hidden="true" className="hero-vehicle-float absolute inset-0">
              <Image
                src={vehicle.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 26rem, 78vw"
                className="object-contain drop-shadow-xl"
                style={{
                  transform: `scale(${PHOTO_ZOOM_SCALE})`,
                  // Nombre compartido con la card de destino en
                  // `/categorias/[grupo]` (ver `EntityCard.tsx`) — cada
                  // card de la fila ahora es un nodo propio y estático
                  // (ya no hay "una sola imagen actual" apilada), así
                  // que el nombre solo se asigna a la card que
                  // realmente dispara la navegación con FLIP.
                  viewTransitionName: flipEnabled ? FLIP_VIEW_TRANSITION_NAME : undefined,
                }}
              />
            </div>
          )

          return (
            <div
              key={vehicle.slug}
              className="relative h-[21rem] w-[19rem] shrink-0 snap-start overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 shadow-lg sm:h-[23rem] sm:w-[26rem] lg:w-[30rem]"
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

              {/* Sello de evidencia — mismo componente visual que ya usa
                  `EntityCard` sobre sus fotos, mismo criterio de color
                  por nivel. */}
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

              {/* Chip "Ver ficha →": CTA sólido, fondo oscuro con
                  contraste real — segundo punto de click real sobre la
                  card, hermano del `<Link>` de categoría de arriba
                  (nunca anidado). Va a la ficha específica de ESTE
                  vehículo, no a la categoría agrupada. */}
              <Link
                href={vehicle.detailHref}
                aria-label={`Ver ficha completa de ${vehicle.manufacturer ? `${vehicle.manufacturer} ` : ''}${vehicle.title}`}
                className="group tap-scale absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-neutral-900/20 ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-black hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
              >
                Ver ficha
                <span
                  aria-hidden="true"
                  className="text-auto-accent-strong transition-transform duration-200 group-hover:translate-x-0.5"
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
              cubre esa navegación en pantallas chicas, y las flechas
              superpuestas competían con el thumb); visibles desde `sm:`
              como en el resto del sitio. Deshabilitadas (no ocultas) en
              el extremo correspondiente del recorrido, para que la fila
              siga leyéndose como "esto es todo, no hay más". */}
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
      </div>
    </div>
  )
}
