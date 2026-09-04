import Image from 'next/image'
import Link from 'next/link'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'

/**
 * Un ítem del bloque izquierdo del hero ("anuncio propio del sitio").
 * `page.tsx` arma un ARRAY de 2-3 de estos (uno por categoría de
 * carrocería, ver `HERO_SELF_PROMO_CATEGORY_ORDER` ahí) — datos reales
 * del catálogo (foto, potencia, precio), nunca inventados: si `page.tsx`
 * no encuentra ningún vehículo con foto resuelta para armar ni un solo
 * ítem, pasa un array vacío y este componente cae a su fallback genérico
 * (ver más abajo) en vez de mostrar specs vacíos.
 */
export interface HeroSelfPromoContent {
  /** Etiqueta corta arriba del título (ej. "Por qué elegir un sedán"). */
  eyebrow: string
  /** Título del vehículo recomendado (ej. "Toyota Corolla"). */
  headline: string
  src: string
  alt: string
  /** Ficha completa del vehículo — único destino de click de este ítem
   *  (ver docstring del componente: QUINTO REDISEÑO, un solo click por
   *  fila, sin link anidado ni link de categoría separado). */
  detailHref: string
  powerLabel?: string | null
  secondaryStatLabel?: string | null
  evidenceLevel?: EvidenceLevel
}

interface HeroSelfPromoCardProps {
  /** 2-3 ítems ya armados en servidor, todos visibles a la vez, sin
   *  rotación — array vacío cuando `page.tsx` no encontró ningún vehículo
   *  disponible (fallback genérico, sin filas). */
  items: HeroSelfPromoContent[]
  className?: string
}

/**
 * QUINTO REDISEÑO — "VARIAS A LA VEZ, ESTÁTICO Y ROBUSTO" (sept. 2026).
 *
 * Reemplaza la versión anterior (un slide por vez, navegado a mano con
 * flechas/dots/swipe, `'use client'` con estado de índice y drag). Pedido
 * explícito: mostrar 2-3 recomendaciones A LA VEZ en la misma franja, SIN
 * rotación automática NI flechas — se lee todo de un vistazo, no hay nada
 * que esperar ni que tocar para ver el resto.
 *
 * Simplificación deliberada del modelo de click, no solo estética: la
 * versión anterior tenía DOS puntos de click por ítem (foto → categoría,
 * chip CTA → ficha) que dependían de que ningún elemento absoluto se
 * interpusiera en el área del otro. Acá cada fila es UN solo `<Link>` que
 * envuelve toda la fila (foto + texto) y va directo a la ficha del
 * vehículo — menos superficie para que un z-index o un handler de swipe
 * mal calzado vuelva a romper el click, que fue exactamente la queja que
 * motivó este rediseño. Sin `useState`/`useRef`/handlers de puntero: este
 * componente ya no necesita `'use client'`, se renderiza 100% en servidor
 * — un click roto por hidratación tardía o por JS que no llegó a correr
 * deja de ser posible acá.
 *
 * Layout: columna de 2-3 filas horizontales (foto cuadrada a la
 * izquierda, texto+specs a la derecha, flecha al final) que llenan la
 * altura completa del bloque a partes iguales (`flex-1` por fila) — el
 * mismo lenguaje visual (`hero-glow-card`/`hero-card-hover`, halo +
 * elevación al hover) que ya usaba la versión anterior y que sigue usando
 * el carrusel de la derecha, así el bloque no pierde el "más vistoso" ya
 * logrado, solo la interacción de navegación que generaba el problema.
 */
export function HeroSelfPromoCard({ items, className }: HeroSelfPromoCardProps) {
  const containerClassName = cn(
    'hero-glow-card relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-900 text-white shadow-lg',
    className
  )

  // Fallback sin vehículo (catálogo sin ninguna foto resuelta disponible
  // para este bloque, caso borde): pitch genérico del sitio, sin specs ni
  // foto inventada.
  if (items.length === 0) {
    return (
      <aside aria-label="Recomendación del sitio" className={containerClassName}>
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
            className="cta-shine tap-scale group mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Ver catálogo{' '}
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </aside>
    )
  }

  return (
    <aside aria-label="Recomendación del sitio" className={containerClassName}>
      {/* Encabezado del bloque — una sola vez para todo el grupo (ya no
          hay un badge por ítem: con 2-3 filas visibles a la vez, repetir
          el chip por fila era ruido, no señal). */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/70">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-white/70">
          Nuestra recomendación
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-2.5">
        {items.map((item, index) => (
          <Link
            key={item.detailHref}
            href={item.detailHref}
            aria-label={`Ver ficha completa de ${item.headline}`}
            className="hero-card-hover tap-scale group animate-fade-in relative flex flex-1 items-stretch gap-3 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition-colors duration-150 hover:bg-white/10 hover:ring-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auto-accent"
            style={{ animationDelay: `${index * 90}ms`, animationFillMode: 'backwards' }}
          >
            <div className="relative w-24 shrink-0 overflow-hidden rounded-l-2xl bg-white/10 sm:w-28">
              {/* `priority` solo en el primer ítem: es contenido arriba
                  del pliegue y candidato real a LCP — el resto conserva
                  el lazy-loading por defecto de `next/image`, no hace
                  falta adelantar toda la fila. */}
              <Image
                src={item.src}
                alt=""
                aria-hidden="true"
                fill
                sizes="(min-width: 640px) 7rem, 6rem"
                priority={index === 0}
                className="hero-row-photo object-cover"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2 pr-2">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                {item.eyebrow}
              </p>
              <p className="truncate font-display text-base font-bold leading-tight sm:text-lg">
                {item.headline}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] font-medium text-white/75">
                {item.powerLabel && <span>{item.powerLabel}</span>}
                {item.powerLabel && item.secondaryStatLabel && (
                  <span aria-hidden="true" className="text-white/30">·</span>
                )}
                {item.secondaryStatLabel && <span>{item.secondaryStatLabel}</span>}
                {item.evidenceLevel && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide',
                      EVIDENCE_STAMP_META[item.evidenceLevel].className
                    )}
                  >
                    <span aria-hidden="true">{EVIDENCE_STAMP_META[item.evidenceLevel].icon}</span>
                    {EVIDENCE_STAMP_META[item.evidenceLevel].shortLabel}
                  </span>
                )}
              </div>
            </div>

            <span
              aria-hidden="true"
              className="flex shrink-0 items-center pr-3 text-white/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
