import Image from 'next/image'
import Link from 'next/link'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'

/**
 * Contenido del bloque izquierdo del hero ("anuncio propio del sitio").
 * FIJO por decisión de producto (no rota como el carrusel de la derecha,
 * ver `HeroVehicleShowcase`): una sola idea editorial a la vez, que se
 * cambia a mano editando el criterio de selección en `page.tsx` (hoy:
 * "recomendación del momento" en una categoría, por defecto Sedán).
 *
 * Server component (`page.tsx`) arma este objeto igual que
 * `HeroVehicleShowcaseItem` — mismo motivo: `resolveEntityDisplayImage`
 * depende de `fs` y no puede resolverse en un client component. Datos
 * reales del catálogo (foto, potencia, precio), nunca inventados: si
 * `page.tsx` no encuentra ningún vehículo con foto resuelta para armar
 * este bloque, pasa `null` y este componente cae a su fallback genérico
 * (ver más abajo) en vez de mostrar specs vacíos o de relleno.
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
  content: HeroSelfPromoContent | null
  className?: string
}

/**
 * Bloque izquierdo del hero, hermano del carrusel de la derecha (ver
 * `HeroVehicleShowcase`) — mismo alto (`h-full`, ambos viven en un grid
 * `items-stretch`), mismo lenguaje visual (`rounded-3xl border shadow-lg`),
 * pero formato "banner editorial": la foto ocupa la tarjeta completa
 * (`object-cover` a sangre, no una caja de foto separada arriba) con un
 * degradé oscuro al pie para que el texto (eyebrow + título + specs +
 * CTA) quede legible encima sin taparla del todo — a propósito distinto
 * del carrusel (foto en caja propia + franja de texto abajo) para que
 * las dos piezas no se lean como la misma cosa repetida dos veces.
 *
 * Dos puntos de click reales, nunca un `<Link>` anidado dentro de otro
 * (mismo patrón que el carrusel): la foto entera linkea a la categoría
 * agrupada (`categoryHref`, si existe), el chip de CTA linkea a la
 * ficha específica de este vehículo (`detailHref`) — son hermanos en el
 * mismo contenedor `relative`, no un link dentro del otro.
 */
export function HeroSelfPromoCard({ content, className }: HeroSelfPromoCardProps) {
  const cardClassName = cn(
    'relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-900 text-white shadow-lg',
    className
  )

  // Fallback sin vehículo (catálogo sin ninguna foto resuelta disponible
  // para este bloque, caso borde): pitch genérico del sitio, sin specs
  // ni foto inventada — sigue siendo un CTA real y clickeable, solo que
  // apunta al catálogo completo en vez de a una ficha puntual.
  if (!content) {
    return (
      <div className={cardClassName}>
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
            className="tap-scale mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Ver catálogo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  const canLink = Boolean(content.categoryHref)

  // Mismo pulido de "vida" del carrusel (ver el comentario largo sobre
  // `.hero-vehicle-float` en `HeroVehicleShowcase.tsx`): wrapper propio
  // con `absolute inset-0`, nunca en el nodo de `Image` en sí — acá no
  // hay un segundo `transform` inline compitiendo (esta foto no tiene
  // zoom, a diferencia del carrusel), pero se mantiene el mismo patrón
  // de nodo separado para no acoplar la animación CSS al posicionamiento
  // de `next/image` con `fill`.
  const photo = (
    <div aria-hidden="true" className="hero-vehicle-float absolute inset-0">
      <Image
        src={content.src}
        alt=""
        fill
        sizes="(min-width: 1024px) 40rem, 100vw"
        priority
        className="object-cover"
      />
    </div>
  )

  return (
    <div className={cardClassName}>
      {canLink ? (
        <Link
          href={content.categoryHref as string}
          aria-label={`Ver ${content.headline} en su categoría`}
          className="tap-scale absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-auto-accent"
        >
          {photo}
        </Link>
      ) : (
        photo
      )}

      {/* Degradé oscuro de pie a mitad de tarjeta: garantiza contraste
          del texto sobre cualquier foto real, sin depender de qué tan
          clara u oscura sea cada imagen puntual del catálogo. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {content.evidenceLevel && (
        <span
          className={cn(
            'pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide shadow-sm backdrop-blur-sm',
            EVIDENCE_STAMP_META[content.evidenceLevel].className
          )}
          title="Nivel de evidencia — ver detalle completo en la ficha"
        >
          <span aria-hidden="true">{EVIDENCE_STAMP_META[content.evidenceLevel].icon}</span>
          {EVIDENCE_STAMP_META[content.evidenceLevel].shortLabel}
        </span>
      )}

      <div className="relative z-10 mt-auto flex flex-col gap-3 p-5">
        <div>
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
              anidado dentro), mismo patrón que el chip "Ver ficha" del
              carrusel de la derecha. */}
          <Link
            href={content.detailHref}
            aria-label={`Ver ficha completa de ${content.headline}`}
            className="group tap-scale relative z-10 ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-neutral-900 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
          >
            {content.ctaLabel}
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
