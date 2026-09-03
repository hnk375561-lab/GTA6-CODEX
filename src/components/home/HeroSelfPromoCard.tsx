'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'

/**
 * Un slide del bloque izquierdo del hero ("anuncio propio del sitio").
 * `page.tsx` arma un ARRAY de estos (uno por categoría de carrocería,
 * ver `HERO_SELF_PROMO_CATEGORY_ORDER` ahí) — CUARTO REDISEÑO (sept.
 * 2026, "más cosas cambiantes"): antes era un único objeto fijo, ahora
 * es una lista que el usuario navega a mano (nunca con temporizador
 * automático, ver docstring del componente más abajo).
 *
 * Server component (`page.tsx`) arma cada slide igual que
 * `HeroVehicleShowcaseItem` — mismo motivo: `resolveEntityDisplayImage`
 * depende de `fs` y no puede resolverse en un client component. Datos
 * reales del catálogo (foto, potencia, precio), nunca inventados: si
 * `page.tsx` no encuentra ningún vehículo con foto resuelta para armar
 * ni un solo slide, pasa un array vacío y este componente cae a su
 * fallback genérico (ver más abajo) en vez de mostrar specs vacíos.
 */
export interface HeroSelfPromoContent {
  /** Etiqueta corta arriba del título (ej. "Por qué elegir un sedán"). */
  eyebrow: string
  /** Título del vehículo recomendado (ej. "Toyota Corolla"). */
  headline: string
  /** Una línea de contexto editorial — por qué se destaca este vehículo. */
  body: string
  src: string
  alt: string
  /** Mismo criterio que `HeroVehicleShowcaseItem.categoryHref`: URL de
   *  `/categorias/[grupo]`, o `null` si el vehículo no tiene categoría
   *  con página SEO propia (la foto deja de ser clickeable en ese caso,
   *  el chip de CTA sigue yendo a la ficha igual). */
  categoryHref?: string | null
  /** Ficha completa del vehículo — destino del CTA principal. */
  detailHref: string
  /** Texto del CTA principal (ej. "Ver ficha"). */
  ctaLabel: string
  powerLabel?: string | null
  secondaryStatLabel?: string | null
  evidenceLevel?: EvidenceLevel
}

interface HeroSelfPromoCardProps {
  /** Uno o más slides ya armados en servidor — array vacío cuando
   *  `page.tsx` no encontró ningún vehículo disponible (fallback
   *  genérico, sin flechas/dots). Con un solo slide, tampoco se
   *  muestran controles de navegación (no hay entre qué elegir). */
  slides: HeroSelfPromoContent[]
  className?: string
}

/** Distancia mínima de arrastre (px) para contar un swipe como cambio de
 *  slide en vez de un click limpio sobre la foto/CTA — mismo criterio de
 *  umbral que ya usa `FeaturedCarousel` para no robarle el click a los
 *  links de abajo (ver el comentario largo ahí). */
const SWIPE_THRESHOLD_PX = 40

/** Chip "esto es nuestra recomendación" — mismo chip en el fallback sin
 *  vehículo y en la versión con contenido real, así el bloque siempre se
 *  lee como señalado a propósito, tenga o no datos de catálogo detrás.
 *  Halo pulsante propio (`hero-badge-glow`, ver `globals.css`) — parte
 *  del pase "más vistoso" (sept. 2026): la flecha ya no es un ícono
 *  quieto, respira para que el ojo la encuentre primero al entrar al
 *  panel. `pointer-events-none`: es una etiqueta, no debe restar área de
 *  click a la foto de abajo — el texto SÍ se anuncia a lectores de
 *  pantalla (solo el ícono va `aria-hidden`). */
function RecommendationBadge() {
  return (
    <span className="hero-badge-glow pointer-events-none absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-md">
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
      Nuestra recomendación
    </span>
  )
}

/**
 * Bloque izquierdo de la franja del hero (ver `HeroVehicleShowcase`, que
 * la monta como bloque fijo hermano del carrusel de vehículos) — mismo
 * lenguaje visual que las cards de vehículo (`rounded-3xl border
 * shadow-lg`), pero formato "banner editorial": la foto ocupa la tarjeta
 * completa (`object-cover` a sangre) con un degradé oscuro al pie para
 * que el texto quede legible encima.
 *
 * CUARTO REDISEÑO ("más cosas cambiantes", sept. 2026) — dos cambios de
 * fondo sobre la versión anterior (slide único, fijo):
 *
 * 1) NAVEGACIÓN MANUAL ENTRE SLIDES. `slides` ahora es un array (uno por
 *    categoría de carrocería, armado en `page.tsx`). El avance es
 *    SIEMPRE manual — flechas prev/next (mismo lenguaje visual que las
 *    del carrusel de la derecha) + dots clickeables + swipe con
 *    puntero/touch — nunca un temporizador automático (pedido explícito:
 *    "rota pero solo al hacer click/swipe"). El swipe reusa el mismo
 *    patrón de umbral de `FeaturedCarousel` (ver `SWIPE_THRESHOLD_PX`):
 *    se mide el arrastre en `pointerup` contra el punto de partida y
 *    recién ahí se decide si fue un swipe real o un click limpio — un
 *    `<Link>` de la foto nunca pierde su click por un swipe fallido
 *    (`onClick` del link chequea la misma bandera de arrastre).
 * 2) MÁS IMPACTO VISUAL. Halo de acento animado detrás de la card
 *    (`.hero-glow-card`, ver `globals.css` — gradiente cónico rosa/
 *    cian/dorado que gira y se enciende al hover), hover más agresivo
 *    (elevación + escala, no solo la foto respirando de siempre),
 *    badge con pulso propio, y barrido de luz (`.cta-shine`, ya usado en
 *    los CTA grandes del hero) en el chip de CTA para que el punto de
 *    click más importante de la card se note más.
 *
 * Dos puntos de click reales, nunca un `<Link>` anidado dentro de otro:
 * la foto entera linkea a la categoría agrupada (`categoryHref`, si
 * existe), el chip de CTA linkea a la ficha específica (`detailHref`).
 */
export function HeroSelfPromoCard({ slides, className }: HeroSelfPromoCardProps) {
  const [index, setIndex] = useState(0)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)

  const cardClassName = cn(
    'hero-glow-card hero-card-hover relative flex h-[21rem] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-900 text-white shadow-lg',
    className
  )

  // Fallback sin vehículo (catálogo sin ninguna foto resuelta disponible
  // para este bloque, caso borde): pitch genérico del sitio, sin specs
  // ni foto inventada. Sin controles de navegación: no hay slides entre
  // los que elegir.
  if (slides.length === 0) {
    return (
      <div className={cardClassName}>
        <RecommendationBadge />
        <div className="flex h-full flex-col justify-end bg-gradient-to-br from-neutral-800 via-neutral-900 to-black p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
            {`Explorá el expediente`}
          </p>
          <p className="mt-3 font-display text-2xl font-bold leading-tight">
            Todas las fichas, con fuente citada
          </p>
          <p className="mt-2 max-w-sm text-sm text-neutral-300">
            Specs reales de fabricante, nunca relleno — compará antes de decidir.
          </p>
          <Link
            href="/vehiculos"
            className="cta-shine tap-scale mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Ver catálogo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  const safeIndex = index % slides.length
  const content = slides[safeIndex]
  const canLink = Boolean(content.categoryHref)
  const canNavigate = slides.length > 1

  function goTo(next: number) {
    setIndex(((next % slides.length) + slides.length) % slides.length)
  }
  function goPrev() {
    goTo(safeIndex - 1)
  }
  function goNext() {
    goTo(safeIndex + 1)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canNavigate) return
    draggingRef.current = false
    startXRef.current = e.clientX
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canNavigate) return
    if (Math.abs(e.clientX - startXRef.current) > 8) draggingRef.current = true
  }
  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canNavigate) return
    const deltaX = e.clientX - startXRef.current
    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
      if (deltaX < 0) goNext()
      else goPrev()
    }
  }
  // El swipe se resuelve en `pointerup` (arriba); acá solo evitamos que
  // el `click` sintético que sigue navegue el `<Link>` de la foto cuando
  // el gesto SÍ fue un arrastre real — mismo problema de fondo que
  // `FeaturedCarousel` documenta en detalle. Se resetea después para que
  // el próximo click limpio funcione normal.
  function onPhotoLinkClick(e: ReactMouseEvent) {
    if (draggingRef.current) {
      e.preventDefault()
      draggingRef.current = false
    }
  }

  // Mismo pulido de "vida" del carrusel (ver el comentario largo sobre
  // `.hero-vehicle-float` en `HeroVehicleShowcase.tsx`): wrapper propio
  // con `absolute inset-0`, nunca en el nodo de `Image` en sí. `key`
  // sobre la imagen (nueva en este rediseño): fuerza remount al cambiar
  // de slide, así `.animate-fade-in` corre de nuevo en cada foto.
  const photo = (
    <div aria-hidden="true" className="hero-vehicle-float absolute inset-0 z-0">
      <Image
        key={content.src}
        src={content.src}
        alt=""
        fill
        sizes="(min-width: 1280px) 27rem, (min-width: 1024px) 24rem, 100vw"
        priority
        className="animate-fade-in object-cover"
      />
    </div>
  )

  return (
    <div
      className={cardClassName}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        draggingRef.current = false
      }}
      style={{ touchAction: canNavigate ? 'pan-y' : undefined }}
    >
      {canLink ? (
        <Link
          href={content.categoryHref as string}
          aria-label={`Ver ${content.headline} en su categoría`}
          onClick={onPhotoLinkClick}
          className="tap-scale absolute inset-0 z-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-auto-accent"
        >
          {photo}
        </Link>
      ) : (
        photo
      )}

      {/* Degradé oscuro de pie a mitad de tarjeta: garantiza contraste
          del texto sobre cualquier foto real. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      <RecommendationBadge />

      {/* Sello de evidencia: esquina superior DERECHA, para no
          superponerse con `RecommendationBadge`. */}
      {content.evidenceLevel && (
        <span
          className={cn(
            'pointer-events-none absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide shadow-sm backdrop-blur-sm',
            EVIDENCE_STAMP_META[content.evidenceLevel].className
          )}
          title="Nivel de evidencia — ver detalle completo en la ficha"
        >
          <span aria-hidden="true">{EVIDENCE_STAMP_META[content.evidenceLevel].icon}</span>
          {EVIDENCE_STAMP_META[content.evidenceLevel].shortLabel}
        </span>
      )}

      {/* Flechas prev/next — mismo lenguaje visual que las del carrusel
          de la derecha (`HeroVehicleShowcase`), acá siempre visibles
          (card angosta, no hace falta reservarlas para `sm:` como en el
          carrusel ancho) — solo si hay más de un slide entre el que
          elegir. */}
      {canNavigate && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Recomendación anterior"
            className="tap-scale absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-all duration-150 hover:-translate-x-0.5 hover:bg-black/60 hover:ring-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Siguiente recomendación"
            className="tap-scale absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-all duration-150 hover:translate-x-0.5 hover:bg-black/60 hover:ring-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* `z-20`: por encima de la foto (`z-0`) y el degradé (`z-[1]`). */}
      <div className="relative z-20 mt-auto flex flex-col gap-3 p-5">
        <div key={content.headline} className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">{content.eyebrow}</p>
          <p className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">{content.headline}</p>
          <p className="mt-1.5 max-w-sm text-sm text-white/80">{content.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(content.powerLabel || content.secondaryStatLabel) && (
            <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md">
              {content.powerLabel && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-auto-accent">
                    <path d="M13 2 3 14h7l-1 8 11-14h-7l0-6z" />
                  </svg>
                  <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-white">
                    {content.powerLabel}
                  </span>
                </div>
              )}
              {content.powerLabel && content.secondaryStatLabel && (
                <span aria-hidden="true" className="my-2 w-px bg-white/15" />
              )}
              {content.secondaryStatLabel && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-auto-accent-orange">
                    <path d="M20.59 13.41 12 22l-9-9V3h10l7.59 8.41a2 2 0 0 1 0 2.18Z" />
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-white">
                    {content.secondaryStatLabel}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Chip de CTA — hermano del `<Link>` de la foto (nunca
              anidado dentro). `.cta-shine` (barrido de luz al hover):
              parte del pase "más vistoso" — mismo efecto que ya
              reservaba el sitio para los 1-2 CTA primarios por vista. */}
          <Link
            href={content.detailHref}
            aria-label={`Ver ficha completa de ${content.headline}`}
            className="cta-shine group tap-scale relative z-10 ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-neutral-900 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
          >
            {content.ctaLabel}
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>

        {/* Dots — mismo criterio que las flechas: solo con más de un
            slide. Cada dot es un botón real (no solo un indicador
            visual), navegación directa además de prev/next/swipe. */}
        {canNavigate && (
          <div className="mt-1 flex items-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.headline}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver recomendación ${i + 1} de ${slides.length}: ${slide.headline}`}
                aria-current={i === safeIndex}
                className={cn(
                  'tap-scale h-1.5 rounded-full transition-all duration-200',
                  i === safeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/60'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
