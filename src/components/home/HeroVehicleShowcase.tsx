'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Parallax } from '@/components/home/Parallax'
import { useStageProgress } from '@/components/home/StageProgress'
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
   *  la capa se comporta exactamente igual que antes de este experimento
   *  (puramente decorativa, sin click). Con href, habilita la navegación
   *  y — cuando el navegador lo soporta y no hay `prefers-reduced-motion`
   *  — la transición FLIP experimental hacia la card correspondiente en
   *  Categorías (ver `lib/view-transitions.ts`). */
  categoryHref?: string | null
  /** URL de la ficha completa del vehículo (`/vehiculos/[slug]`) — a
   *  diferencia de `categoryHref` (que agrupa por carrocería), este es
   *  el destino específico de ESTE vehículo. Segundo punto de click real
   *  sobre la pieza (ver "chip" más abajo), no reemplaza al click sobre
   *  la foto entera (que sigue yendo a `categoryHref`) — son dos
   *  elementos hermanos, nunca un `<Link>` anidado dentro de otro. */
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
 * Ventana de progreso local del panel (mismo `progress` [0,1] que ya lee
 * `Reveal` vía `useStageProgress`) en la que entra esta capa: arranca un
 * poco después del H1 (`Reveal index=0`) y ya está asentada antes de que
 * entre el subtítulo (`index=1`). No se reutiliza `Reveal` en sí porque
 * su `staggerStyle` solo resuelve el caso vertical (`translateY`) y acá
 * el pedido explícito es una entrada horizontal (\"desde la derecha\") en
 * desktop — ver `isDesktop` más abajo para el fallback vertical en mobile.
 */
const ENTRANCE_START = 0.12
const ENTRANCE_END = 0.42

/** Desplazamiento inicial en px antes de asentar, por breakpoint. */
const ENTRANCE_OFFSET_DESKTOP_PX = 48
const ENTRANCE_OFFSET_MOBILE_PX = 20

/**
 * Factor de zoom aplicado a cada foto del stack (auditoría "vida del
 * hero", hallazgo P0): las fotos reales de prensa/ficha oficial traen
 * mucho margen blanco propio alrededor del vehículo — con `object-contain`
 * puro sobre un fondo también blanco, ese margen se leía como "recuadro
 * casi vacío" (el bug real detrás de la sensación de "poca vida"), no
 * solo un problema de layout. En vez de recortar cada asset a mano (250
 * fichas, pipeline de Commons), se escala la imagen ya encajada
 * (`object-contain` sigue garantizando que el vehículo completo entra en
 * su caja) dentro de un contenedor propio con `overflow-hidden`: el
 * margen blanco excedente queda recortado por el contenedor, el vehículo
 * (centrado en casi todas las fotos reales del dataset) queda más grande
 * y protagonista. Valor conservador (no tan agresivo como para arriesgar
 * cortar ruedas/techo en fotos con encuadre menos centrado).
 */
const PHOTO_ZOOM_SCALE = 1.4

function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - c, 3)
}

interface HeroVehicleShowcaseProps {
  vehicles: HeroVehicleShowcaseItem[]
  className?: string
}

/**
 * Capa media del hero de la home: entre el fondo (blobs) y el texto
 * (H1/subtítulo), muestra la foto real de un vehículo `featured` que
 * entra desde la derecha con delay respecto al H1 y rota cada ~4s entre
 * los vehículos recibidos (crossfade, no corte seco). Ver
 * `src/app/page.tsx` para cómo se arma `vehicles`.
 *
 * Auditoría "vida del hero" (sept. 2026), agregados sobre la versión
 * original — todo aditivo, nada se saca:
 * - Zoom del recorte de foto (`PHOTO_ZOOM_SCALE`, ver comentario arriba).
 * - Flotación ambiental continua (`.hero-vehicle-float`, `globals.css`):
 *   movimiento de fondo constante en vez de solo el salto cada 4s —
 *   apagado por completo vía `@media (prefers-reduced-motion: reduce)`
 *   en CSS puro (mismo criterio que el marquee de fabricantes), en una
 *   capa propia (ver estructura del JSX) para no pisar el `transform`
 *   inline que ya usa la entrada ligada al scroll (`entranceStyle`) —
 *   dos `transform` distintos en dos elementos, nunca en el mismo nodo.
 * - Controles manuales (prev/next + puntos con barra de progreso):
 *   antes la rotación era 100% automática, sin ningún punto de
 *   interacción del usuario con la pieza más grande del hero. Los
 *   puntos también sirven de indicador de avance (la barra se llena en
 *   `ROTATE_INTERVAL_MS`) — motion visible todo el tiempo, no solo al
 *   saltar de vehículo. Se pausa con hover/focus (mismo criterio que el
 *   marquee) y todo es `<button>` real con `aria-label`/`aria-current`.
 * - Overlay informativo sobre la foto (solo desktop, `isDesktop`, mismo
 *   gate que ya usaba el parallax): sello de evidencia (mismo componente
 *   visual que `EntityCard`), dos badges de spec con línea conectora
 *   (potencia + precio/velocidad, dato real vía `parsePowerHp`/
 *   `parsePriceUsd`, calculado en el caller) y un chip "Ver ficha →" que
 *   linkea a la ficha específica del vehículo (`detailHref`) — sin
 *   anidar `<Link>` dentro del `<Link>` de categoría: son hermanos
 *   posicionados sobre la misma caja, no un padre-hijo.
 *
 * Mobile (`isDesktop` false, breakpoint `sm` de Tailwind): sigue exactamente
 * igual que antes de esta auditoría — sin overlay, sin controles, sin
 * parallax de mouse — porque ahí la imagen ya es una capa decorativa de
 * fondo detrás del texto (`opacity-60`, ver `page.tsx`), no el protagonista.
 *
 * Accesibilidad: la imagen del stack de crossfade sigue siendo puramente
 * decorativa (`aria-hidden`) con su `sr-only aria-live="polite"` aparte
 * (mismo criterio que antes). Los elementos nuevos (badges, chip,
 * controles) SON contenido real, nunca `aria-hidden`: llevan su propio
 * texto visible o `aria-label` según corresponda.
 *
 * `prefers-reduced-motion`: sin rotación automática, sin la entrada
 * animada, sin la flotación ambiental y sin la transición FLIP — mismo
 * criterio que el resto del hero. Los controles manuales (prev/next/
 * puntos) siguen disponibles igual con reduced motion: elegir qué
 * vehículo ver no es una animación, es una acción del usuario.
 */
export function HeroVehicleShowcase({ vehicles, className }: HeroVehicleShowcaseProps) {
  const progress = useStageProgress()
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
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

  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)')
    setIsDesktop(query.matches)
    const onChange = () => setIsDesktop(query.matches)
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

  if (vehicles.length === 0) return null

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

  const eased = reducedMotion ? 1 : easeOutCubic((progress - ENTRANCE_START) / (ENTRANCE_END - ENTRANCE_START))
  const offset = (1 - eased) * (isDesktop ? ENTRANCE_OFFSET_DESKTOP_PX : ENTRANCE_OFFSET_MOBILE_PX)
  const entranceStyle = {
    opacity: eased,
    transform: isDesktop ? `translateX(${offset}px)` : `translateY(${offset}px)`,
  }

  // Solo se activa con soporte real del navegador y sin reduced motion
  // (ver el bloque de comentarios sobre el componente). `canLink`
  // depende únicamente de si el vehículo actual tiene categoría propia
  // — independiente de si la animación FLIP en sí está disponible, para
  // que la navegación funcione igual en un navegador sin soporte.
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
            sizes="(min-width: 640px) 32rem, 20rem"
            priority={i === 0}
            className="object-contain drop-shadow-2xl"
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

  const photoBox = (
    <div className={cn('relative aspect-[4/3] w-full max-w-md sm:max-w-lg', className)} style={entranceStyle}>
      {/* Caja recortada: solo la foto vive acá adentro (`overflow-hidden`,
          ver `PHOTO_ZOOM_SCALE`). Los overlays de abajo son hermanos de
          esta caja, no hijos — así pueden "sangrar" fuera del recuadro
          (badges de spec) sin quedar recortados también. */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
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
      </div>

      {isDesktop && (
        <>
          {/* Sello de evidencia — mismo componente visual que ya usa
              `EntityCard` sobre sus fotos, mismo criterio de color por
              nivel (`EVIDENCE_STAMP_META`). Mete la propuesta de valor
              central del sitio (evidencia citada) en el primer viewport,
              no recién en el panel "Un dato, una fuente". */}
          {current.evidenceLevel && (
            <span
              className={cn(
                'absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm',
                EVIDENCE_STAMP_META[current.evidenceLevel].className
              )}
              title="Nivel de evidencia — ver detalle completo en la ficha"
            >
              <span aria-hidden="true">{EVIDENCE_STAMP_META[current.evidenceLevel].icon}</span>
              {EVIDENCE_STAMP_META[current.evidenceLevel].shortLabel}
            </span>
          )}

          {/* Badge de potencia, arriba a la derecha, "sangrando" fuera
              del recuadro con su línea conectora — dato real
              (`parsePowerHp`, calculado en `page.tsx`). */}
          {current.powerLabel && (
            <div className="pointer-events-none absolute left-full top-8 z-10 flex items-center gap-2">
              <span aria-hidden="true" className="h-px w-6 bg-neutral-300" />
              <span className="pointer-events-auto whitespace-nowrap rounded-full border border-edge-strong bg-auto-darker/90 px-2.5 py-1 font-mono text-[11px] font-semibold text-auto-accent-strong backdrop-blur-sm">
                {current.powerLabel}
              </span>
            </div>
          )}

          {/* Segundo badge, abajo a la izquierda, mismo criterio del
              lado opuesto — precio USD o velocidad máxima según lo que
              tenga la ficha (ver `secondaryStatLabel` en `page.tsx`). */}
          {current.secondaryStatLabel && (
            <div className="pointer-events-none absolute right-full bottom-8 z-10 flex flex-row-reverse items-center gap-2">
              <span aria-hidden="true" className="h-px w-6 bg-neutral-300" />
              <span className="pointer-events-auto whitespace-nowrap rounded-full border border-edge-strong bg-auto-darker/90 px-2.5 py-1 font-mono text-[11px] font-semibold text-auto-accent-strong backdrop-blur-sm">
                {current.secondaryStatLabel}
              </span>
            </div>
          )}

          {/* Chip "Ver ficha →": segundo punto de click real sobre la
              pieza, hermano del `<Link>` de categoría de arriba (nunca
              anidado) — va a la ficha específica de ESTE vehículo, no
              a la categoría agrupada. */}
          <Link
            href={current.detailHref}
            aria-label={`Ver ficha completa de ${current.manufacturer ? `${current.manufacturer} ` : ''}${current.title}`}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-edge-strong bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
          >
            Ver ficha <span aria-hidden="true">→</span>
          </Link>
        </>
      )}
    </div>
  )

  const layer = (
    <div className="hero-vehicle-float">
      {isDesktop ? <Parallax strength={24}>{photoBox}</Parallax> : photoBox}
    </div>
  )

  return (
    // `pointer-events-auto`: el wrapper que monta este componente en
    // `page.tsx` (capa media del hero) es `pointer-events-none` a
    // propósito (deja pasar los clicks al texto de encima cuando se
    // superponen) — sin "reencenderlo" acá, NINGÚN elemento clicable de
    // este componente (el `<Link>` de categoría que ya existía, y todo
    // lo nuevo: chip, badges, controles) recibiría un solo click, porque
    // `pointer-events` es una propiedad heredada. Se reactiva a nivel de
    // este contenedor (no en cada botón suelto) para que toda la pieza
    // — imagen + controles — vuelva a responder como una unidad.
    <div className="pointer-events-auto flex flex-col items-center gap-4">
      {layer}

      {/* Controles manuales + indicador de avance (solo desktop, mismo
          gate que el resto del overlay): antes la rotación era 100%
          automática sin ningún control real del usuario. Pausa con
          hover/focus, mismo criterio que `ManufacturersMarquee`. */}
      {isDesktop && vehicles.length > 1 && (
        <div
          className="flex items-center gap-3"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <button
            type="button"
            onClick={goPrev}
            aria-label="Vehículo anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-edge text-neutral-500 transition-colors hover:border-neutral-900 hover:text-neutral-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {vehicles.map((vehicle, i) => (
              <button
                key={vehicle.slug}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver ${vehicle.manufacturer ? `${vehicle.manufacturer} ` : ''}${vehicle.title}`}
                aria-current={i === currentIndex}
                className="relative h-1.5 w-7 overflow-hidden rounded-full bg-neutral-200"
              >
                {i === currentIndex && !reducedMotion && !paused ? (
                  <span
                    key={autoTick}
                    className="hero-vehicle-dot-fill absolute inset-y-0 left-0 rounded-full bg-neutral-900"
                    style={{ animationDuration: `${ROTATE_INTERVAL_MS}ms` }}
                  />
                ) : (
                  i === currentIndex && <span className="absolute inset-0 rounded-full bg-neutral-900" />
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="Vehículo siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-edge text-neutral-500 transition-colors hover:border-neutral-900 hover:text-neutral-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {current.manufacturer ? `${current.manufacturer} ${current.title}` : current.title}
      </span>
    </div>
  )
}
