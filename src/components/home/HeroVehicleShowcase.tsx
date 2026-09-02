'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HeroSelfPromoCard, type HeroSelfPromoContent } from '@/components/home/HeroSelfPromoCard'
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

const ROTATE_INTERVAL_MS = 4000
const CROSSFADE_MS = 600

/**
 * Factor de zoom aplicado a cada foto (las fotos reales de prensa/ficha
 * oficial traen mucho margen blanco propio alrededor del vehículo — con
 * `object-contain` puro ese margen se leía como espacio muerto). En vez
 * de recortar cada asset a mano, se escala la imagen ya encajada dentro
 * de un contenedor propio con `overflow-hidden`: el margen sobrante
 * queda recortado por el contenedor y el vehículo queda más grande y
 * protagonista. Valor conservador para no arriesgar cortar ruedas/techo
 * en fotos con encuadre menos centrado.
 */
const PHOTO_ZOOM_SCALE = 1.4

interface HeroVehicleShowcaseProps {
  vehicles: HeroVehicleShowcaseItem[]
  /** Contenido del bloque izquierdo (ver `HeroSelfPromoCard`) — `null`
   *  cuando `page.tsx` no encontró ningún vehículo con foto resuelta
   *  para armarlo (cae al fallback genérico del componente). */
  selfPromo?: HeroSelfPromoContent | null
  className?: string
}

/**
 * REDISEÑO (sept. 2026, "banner horizontal del hero"): reemplaza por
 * completo a la versión anterior de esta pieza, que era una foto chica
 * flotando en `position: absolute` DETRÁS del texto del hero (capa
 * `-z-10`, `opacity-60` en mobile, con el H1/subtítulo/CTAs superpuestos
 * encima). Ese diseño tenía un problema estructural, no solo estético:
 * los `<div>` de `Reveal` que envuelven cada bloque de texto son
 * elementos de bloque de ancho completo y aparecen DESPUÉS en el DOM que
 * esta capa decorativa — en el mismo contexto de apilamiento, eso alcanza
 * para pintar por encima y comerse el click aunque visualmente solo se
 * viera texto centrado con espacio vacío alrededor (la foto "se veía"
 * pero un área invisible del texto la tapaba). Por eso ningún botón,
 * flecha ni tarjeta de esta pieza respondía al click pese al parche de
 * `pointer-events-auto` que ya tenía el contenedor raíz.
 *
 * La solución no fue otro parche de z-index: es sacar la pieza del
 * `position: absolute` y ponerla en el flujo normal del documento, como
 * un panel más del hero (ver `page.tsx`, entre los CTAs/buscador y la
 * grilla de categorías) — ahí no hay nada superpuesto por encima y cada
 * elemento clicable recibe sus propios eventos sin trucos.
 *
 * De paso, cambia la forma: ya no es una foto vertical/cuadrada
 * flotando sobre el fondo, sino una franja 100% horizontal en dos
 * columnas (`grid`, ver abajo):
 * - IZQUIERDA: `HeroSelfPromoCard` — anuncio propio del sitio (contenido
 *   editorial fijo, no depende del catálogo).
 * - DERECHA: este mismo carrusel de vehículos `featured`, ahora en
 *   formato panorámico (`aspect-[16/10]`/`21/10`) en vez de recuadro
 *   chico, con flechas prev/next superpuestas sobre los bordes de la
 *   propia foto (más "carrusel", menos pastilla de controles aparte) y
 *   los puntos de avance en una franja al pie de la tarjeta.
 *
 * El resto de la lógica de producto se mantiene igual que antes de este
 * rediseño: rotación automática cada `ROTATE_INTERVAL_MS` con pausa en
 * hover/foco, controles manuales reales (`<button>` con `aria-label`),
 * overlay de sello de evidencia + specs + chip "Ver ficha", transición
 * FLIP opcional hacia Categorías, `prefers-reduced-motion` sin rotación
 * automática (pero con controles manuales intactos), y accesibilidad
 * (imagen decorativa `aria-hidden` + anuncio `sr-only aria-live`).
 *
 * La entrada animada ligada al scroll (antes calculada acá mismo con
 * `useStageProgress`) también se saca de este componente: ahora que la
 * pieza vive en el flujo normal del hero, la anima el mismo `Reveal` que
 * ya usa el resto de los bloques del panel (ver `page.tsx`) — un solo
 * mecanismo de entrada para todo el hero, no dos superpuestos.
 *
 * FIX (auditoría "vida del hero", sept. 2026): este archivo ya traía el
 * rediseño de arriba, pero `page.tsx` seguía montando el componente
 * DENTRO del wrapper viejo (`position: absolute`, `-z-10`,
 * `pointer-events-none`) — el mismo problema que el rediseño dice
 * resolver, reintroducido en el caller. Efecto real: nada de esta pieza
 * respondía al click (`pointer-events-none` en un ancestro gana sobre
 * cualquier `pointer-events-auto` de acá adentro) y la franja seguía
 * flotando detrás del texto en vez de ocupar su propio lugar en el
 * flujo. Corregido en `page.tsx`: el `Reveal` que monta este componente
 * ya no tiene ese wrapper. También faltaba el archivo
 * `HeroSelfPromoCard.tsx` (import roto, build nunca llegaba a compilar
 * esta pieza) — se agrega en este mismo cambio.
 *
 * Más horizontal (pedido explícito, sept. 2026): las dos columnas ahora
 * se separan desde `sm` en vez de `lg` (`grid-cols-1 sm:grid-cols-[...]`
 * más abajo) y la caja de foto del carrusel pasa a `21/9` en desktop —
 * la franja se lee "larga" apenas se sale de mobile, en vez de recién
 * en pantallas grandes.
 */
export function HeroVehicleShowcase({ vehicles, selfPromo = null, className }: HeroVehicleShowcaseProps) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [flipSupported, setFlipSupported] = useState(false)
  const [paused, setPaused] = useState(false)
  // Se incrementa en cada avance (automático o manual) — usado como `key`
  // de la barra de progreso para reiniciar su animación CSS, y como
  // dependencia del efecto de auto-rotación para que un click manual
  // reinicie el temporizador en vez de competir con el que ya corría.
  const [autoTick, setAutoTick] = useState(0)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Soporte de View Transitions: se resuelve una sola vez en cliente
  // (no cambia durante la sesión) — evita evaluar `flipEnabled` como
  // `true` en el primer render de servidor/hidratación, donde
  // `document.startViewTransition` todavía no es chequeable.
  useEffect(() => {
    setFlipSupported(supportsViewTransitions())
  }, [])

  useEffect(() => {
    if (reducedMotion || vehicles.length <= 1 || paused) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % vehicles.length)
      setAutoTick((t) => t + 1)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [reducedMotion, vehicles.length, paused, autoTick])

  // El grid con `HeroSelfPromoCard` se arma igual haya o no vehículos
  // (el anuncio propio no depende del catálogo) — si no hay vehículos
  // con foto resuelta, la columna derecha simplemente no se monta y el
  // anuncio queda solo, en vez de perder toda la franja horizontal.
  if (vehicles.length === 0) {
    return (
      <div className={cn('mx-auto grid w-full max-w-3xl grid-cols-1', className)}>
        <HeroSelfPromoCard content={selfPromo} />
      </div>
    )
  }

  // El índice puede haber quedado desalineado si `vehicles` cambia de
  // largo entre renders (no debería pasar con el caller actual, pero es
  // gratis blindarlo).
  const currentIndex = index % vehicles.length
  const current = vehicles[currentIndex]

  function goTo(i: number) {
    setIndex(i)
    setAutoTick((t) => t + 1)
  }
  function goPrev() {
    setIndex((i) => (i - 1 + vehicles.length) % vehicles.length)
    setAutoTick((t) => t + 1)
  }
  function goNext() {
    setIndex((i) => (i + 1) % vehicles.length)
    setAutoTick((t) => t + 1)
  }

  // Solo se activa con soporte real del navegador y sin reduced motion.
  // `canLink` depende únicamente de si el vehículo actual tiene
  // categoría propia — independiente de si la animación FLIP en sí está
  // disponible, para que la navegación funcione igual en un navegador
  // sin soporte.
  const canLink = Boolean(current.categoryHref)
  const flipEnabled = canLink && flipSupported && !reducedMotion

  const imagesStack = (
    <div aria-hidden="true" className="relative h-full w-full">
      {vehicles.map((vehicle, i) => {
        const isCurrent = i === currentIndex
        return (
          <Image
            key={vehicle.slug}
            src={vehicle.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 48rem, 100vw"
            priority={i === 0}
            className="object-contain drop-shadow-xl"
            style={{
              opacity: isCurrent ? 1 : 0,
              transform: `scale(${PHOTO_ZOOM_SCALE})`,
              transition: reducedMotion ? undefined : `opacity ${CROSSFADE_MS}ms ease-in-out`,
              // Nombre compartido con la card de destino en
              // `/categorias/[grupo]` (ver `EntityCard.tsx`) — solo en
              // la imagen realmente visible del stack de crossfade, para
              // no duplicar el nombre dentro del mismo snapshot.
              viewTransitionName: isCurrent && flipEnabled ? FLIP_VIEW_TRANSITION_NAME : undefined,
            }}
          />
        )
      })}
    </div>
  )

  return (
    <div className={cn('grid w-full grid-cols-1 items-stretch gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-5', className)}>
      <HeroSelfPromoCard content={selfPromo} />

      <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg">
        {/* Caja de foto panorámica — antes recuadro chico
            (`aspect-[4/3] max-w-lg`) flotando sobre el fondo; ahora
            ocupa el ancho completo de su columna en formato horizontal,
            cada vez más panorámico a medida que hay más ancho
            disponible (`21/9` en desktop), acorde al pedido de que la
            pieza sea "lo más horizontal posible". */}
        <div className="relative aspect-[4/3] w-full shrink-0 bg-neutral-50 sm:aspect-[16/9] lg:aspect-[21/9]">
          {canLink ? (
            <Link
              href={current.categoryHref as string}
              aria-label={`Ver ${current.manufacturer ? `${current.manufacturer} ` : ''}${current.title} en su categoría`}
              className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-auto-accent"
              onClick={
                flipEnabled
                  ? (e) => {
                      e.preventDefault()
                      navigateWithFlip((href) => router.push(href), current.categoryHref as string, current.slug)
                    }
                  : undefined
              }
            >
              {imagesStack}
            </Link>
          ) : (
            imagesStack
          )}

          {/* Sello de evidencia — mismo componente visual que ya usa
              `EntityCard` sobre sus fotos, mismo criterio de color por
              nivel. Ahora visible en todos los tamaños de pantalla (el
              diseño anterior lo limitaba a desktop porque competía con
              el texto del hero superpuesto — ya no aplica). */}
          {current.evidenceLevel && (
            <span
              className={cn(
                'pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide shadow-sm backdrop-blur-sm',
                EVIDENCE_STAMP_META[current.evidenceLevel].className
              )}
              title="Nivel de evidencia — ver detalle completo en la ficha"
            >
              <span aria-hidden="true">{EVIDENCE_STAMP_META[current.evidenceLevel].icon}</span>
              {EVIDENCE_STAMP_META[current.evidenceLevel].shortLabel}
            </span>
          )}

          {/* Tarjeta de specs unificada: potencia y precio/velocidad
              juntos en una sola pieza con ícono. */}
          {(current.powerLabel || current.secondaryStatLabel) && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-stretch overflow-hidden rounded-2xl border border-edge-strong bg-white/95 shadow-xl backdrop-blur-md">
              {current.powerLabel && (
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
                    {current.powerLabel}
                  </span>
                </div>
              )}

              {current.powerLabel && current.secondaryStatLabel && (
                <span aria-hidden="true" className="my-2 w-px bg-edge-strong" />
              )}

              {current.secondaryStatLabel && (
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
                    {current.secondaryStatLabel}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Chip "Ver ficha →": CTA sólido, fondo oscuro con contraste
              real — segundo punto de click real sobre la pieza, hermano
              del `<Link>` de categoría de arriba (nunca anidado). Va a
              la ficha específica de ESTE vehículo, no a la categoría
              agrupada. */}
          <Link
            href={current.detailHref}
            aria-label={`Ver ficha completa de ${current.manufacturer ? `${current.manufacturer} ` : ''}${current.title}`}
            className="group absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-neutral-900/20 ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-black hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
          >
            Ver ficha
            <span
              aria-hidden="true"
              className="text-auto-accent-strong transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

          {/* Flechas prev/next superpuestas sobre los bordes de la
              propia foto (antes vivían aparte, en una píldora debajo de
              todo) — más lenguaje de "carrusel horizontal real". Son
              hermanas del `<Link>` de categoría (mismo contenedor
              `relative`), nunca hijas de él, así que su click nunca
              dispara también la navegación de la foto. */}
          {vehicles.length > 1 && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-between px-3"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <button
                type="button"
                onClick={goPrev}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                aria-label="Vehículo anterior"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-lg backdrop-blur-sm transition-all duration-150 hover:-translate-x-0.5 hover:bg-white hover:text-neutral-900 active:translate-x-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                aria-label="Vehículo siguiente"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-lg backdrop-blur-sm transition-all duration-150 hover:translate-x-0.5 hover:bg-white hover:text-neutral-900 active:translate-x-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Franja de puntos de avance al pie de la tarjeta (antes era
            una píldora flotante aparte, debajo de toda la pieza) —
            ahora vive integrada a la tarjeta, mismo criterio de "franja
            horizontal" que el resto del rediseño. Pausa con hover/foco,
            mismo criterio que `ManufacturersMarquee`. */}
        {vehicles.length > 1 && (
          <div
            className="flex items-center justify-center gap-1.5 border-t border-neutral-100 bg-neutral-50 px-4 py-3"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {vehicles.map((vehicle, i) => (
              <button
                key={vehicle.slug}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver ${vehicle.manufacturer ? `${vehicle.manufacturer} ` : ''}${vehicle.title}`}
                aria-current={i === currentIndex}
                className={cn(
                  'relative h-2 overflow-hidden rounded-full bg-neutral-200 transition-all duration-200 hover:bg-neutral-300',
                  i === currentIndex ? 'w-8' : 'w-2'
                )}
              >
                {i === currentIndex && !reducedMotion && !paused ? (
                  <span
                    key={autoTick}
                    className="hero-vehicle-dot-fill absolute inset-y-0 left-0 rounded-full bg-auto-accent"
                    style={{ animationDuration: `${ROTATE_INTERVAL_MS}ms` }}
                  />
                ) : (
                  i === currentIndex && <span className="absolute inset-0 rounded-full bg-auto-accent" />
                )}
              </button>
            ))}
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {current.manufacturer ? `${current.manufacturer} ${current.title}` : current.title}
        </span>
      </div>
    </div>
  )
}
