'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { WordRotate } from '@/components/ui/WordRotate'
import { type HeroVehicleShowcaseItem } from '@/components/home/HeroVehicleShowcaseV2'
import { cn } from '@/lib/utils'

/**
 * HERO SHOWROOM — rediseño claro/editorial (auditoría de producción,
 * segunda pasada, sept. 2026).
 *
 * REEMPLAZA el hero oscuro "showroom digital" (panel bg-auto-darker a
 * pantalla completa, auto grande a la derecha) por una composición
 * clara consistente con el resto de la home: fondo blanco liso (mismo
 * `body { @apply bg-white }` que ya usan todos los demás paneles de
 * `page.tsx`, ver `Categorías`/`Destacados`/etc.), con UN SOLO panel
 * oscuro chico y redondeado para el auto — el mismo lenguaje visual
 * "fondo blanco + acento oscuro" que ya usa `<Card>` en el resto del
 * sitio, aplicado acá por primera vez también al hero.
 *
 * Por qué este cambio (feedback real sobre el hero anterior, con
 * capturas del deploy):
 *
 * 1. El hero oscuro a pantalla completa quedaba visualmente
 *    desconectado del resto de la home (blanca) — el propio
 *    comentario de rediseño de `page.tsx` ya advertía este riesgo
 *    ("que no se sienta como dos sitios distintos pegados"). Acá deja
 *    de aplicar: el hero vive en la misma superficie blanca que todo
 *    lo demás, sin salto de fondo al hacer scroll al siguiente panel.
 * 2. Composición: el layout anterior (headline a la izquierda, auto
 *    grande a la derecha, gap grande en el medio) dejaba un hueco
 *    muerto en el centro sin función. Acá el auto pasa a ser un
 *    elemento chico y secundario (no protagonista) — el foco pasa a
 *    ser 100% headline + CTA, sin nada compitiendo por atención.
 * 3. Contenido: se saca el subtítulo, el CTA secundario ("Buscar un
 *    modelo puntual") y la línea de stats (vehículos/marcas) — pedido
 *    explícito de simplificación al mínimo (headline + un solo CTA).
 *    El buscador completo sigue en `/buscar` (accesible desde
 *    `<Header/>`, nunca dependió solo de este link); las stats totales
 *    siguen visibles en el panel "Categorías" inmediatamente debajo.
 * 4. `text-gradient-vice` (gradiente rosa→cian, pensado para fondo
 *    oscuro) se reemplaza por `auto-accent` (el mismo naranja que ya
 *    usa el sitio como color de link/CTA sobre fondo blanco en TODAS
 *    las demás páginas — ver `a:not(.no-style)` en globals.css) — un
 *    gradiente "vice" de un thriller de neón no tiene un motivo
 *    tipográfico real para vivir sobre blanco, y generaba menos
 *    contraste/legibilidad que el naranja de marca ya validado.
 *
 * Se conservan sin cambios (ya funcionaban bien, confirmado por
 * auditoría de código — ver HERO_HOME_PRODUCTION_AUDIT.txt):
 *
 * - El rotador de vehículos `featured` con foto real, sus puntos de
 *   navegación y el botón pausar/reanudar (WCAG 2.2.2).
 * - El montaje diferido de imágenes (`visitedIndices`): solo se pide
 *   la foto activa + las ya visitadas, nunca las N de entrada.
 * - `role="group"` + `aria-pressed` en los puntos (no `tablist`/`tab`,
 *   ese patrón exige navegación por flechas que este control no
 *   implementa).
 * - Pausa en hover/focus sobre la zona del auto, además del botón.
 * - `prefers-reduced-motion` respetado en el autoplay y en las
 *   animaciones de entrada.
 *
 * Tokens: `auto-dark`/`auto-darker`/`auto-text`/`auto-accent` (ver
 * tailwind.config.js) — el panel del auto es el único lugar de este
 * componente que los usa; todo lo demás vive en los tokens claros que
 * ya usa el resto de la home (`neutral-900`/`neutral-500`, Tailwind
 * estándar, sin token custom nuevo).
 */

export interface HeroShowroomProps {
  vehicles: HeroVehicleShowcaseItem[]
  siteName: string
  lastUpdateLabel: string | null
  evidenceCoveragePct: number | null
  headlineBrands: string[]
  headlineLead: string
  headlineTail: string
  catalogHref: string
}

const ROTATE_MS = 5200

export function HeroShowroom({
  vehicles,
  siteName,
  lastUpdateLabel,
  evidenceCoveragePct,
  headlineBrands,
  headlineLead,
  headlineTail,
  catalogHref,
}: HeroShowroomProps) {
  const [index, setIndex] = useState(0)
  // Inicializador perezoso (no un efecto): lee `prefers-reduced-motion`
  // directo en el primer render — evita el patrón "setState en el
  // cuerpo de un efecto" que el lint del propio repo
  // (`react-hooks/set-state-in-effect`) marca como error.
  const [isPlaying, setIsPlaying] = useState(
    () => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const [isPaused, setIsPaused] = useState(false)
  // Qué imágenes ya se mostraron al menos una vez — solo esas se
  // montan en el DOM, para no descargar las N fotos del rotador de
  // entrada cuando solo una es visible. Se actualiza en el mismo
  // evento que cambia `index` (`goToVehicle` / el intervalo de abajo),
  // nunca en un efecto separado, por la misma razón que `isPlaying`.
  const [visitedIndices, setVisitedIndices] = useState<ReadonlySet<number>>(() => new Set([0]))

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setIsPlaying(!e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const goToVehicle = (i: number) => {
    setIndex(i)
    setVisitedIndices((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
  }

  useEffect(() => {
    if (vehicles.length <= 1 || !isPlaying || isPaused) return

    const intervalId = window.setInterval(() => {
      if (document.hidden) return
      setIndex((prev) => {
        const next = (prev + 1) % vehicles.length
        setVisitedIndices((visited) => (visited.has(next) ? visited : new Set(visited).add(next)))
        return next
      })
    }, ROTATE_MS)

    return () => window.clearInterval(intervalId)
  }, [vehicles.length, isPlaying, isPaused])

  const current = vehicles[index] ?? null
  const canAutoRotate = vehicles.length > 1
  const hasVehicle = vehicles.length > 0

  return (
    <div className="relative isolate">
      {/* Eyebrow: marca + fecha, y el acento de confianza a la derecha.
          No es un navbar — la navegación completa vive en <Header />. */}
      <div className="hero-showroom-in flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
          {siteName}
          {lastUpdateLabel && (
            <>
              {' '}
              <span aria-hidden="true" className="text-neutral-400">·</span>{' '}
              <span className="normal-case tracking-normal">Actualizado {lastUpdateLabel}</span>
            </>
          )}
        </p>
        {evidenceCoveragePct !== null && evidenceCoveragePct > 0 && (
          <p className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-auto-accent sm:block">
            {evidenceCoveragePct}% con fuente citada
          </p>
        )}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-10">
        {/* Headline + CTA — el foco real del hero, sin nada más
            compitiendo por atención (sin subtítulo, sin segundo CTA,
            sin stats): eso vive ahora en el panel "Categorías" de
            abajo, no acá. */}
        <div className="hero-showroom-in hero-showroom-in-delay-1 lg:col-span-8">
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-6xl lg:text-[5rem]">
            {headlineLead} <WordRotate words={headlineBrands} className="text-auto-accent" />
            {', '}
            <span className="block">{headlineTail}</span>
          </h1>

          <div className="mt-9">
            <Link
              href={catalogHref}
              className="tap-scale inline-flex items-center gap-2 rounded-lg bg-auto-accent px-7 py-3.5 font-display text-base font-semibold text-auto-darker transition-transform hover:scale-[1.03]"
            >
              Ver el catálogo
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* El auto — acompañamiento, no protagonista: panel chico y
            oscuro (único acento oscuro del hero), mismo lenguaje que
            usan las cards del resto del sitio (fondo claro + acento
            oscuro), acá aplicado al hero por primera vez. */}
        {hasVehicle && (
          <div
            className="hero-showroom-in hero-showroom-in-delay-2 mx-auto w-full max-w-xs lg:col-span-4 lg:mx-0 lg:max-w-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setIsPaused(false)
            }}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-auto-darker ring-1 ring-black/5">
              {vehicles.map((vehicle, i) => {
                // Solo se monta la imagen actual + las ya visitadas:
                // evita descargar de entrada las N fotos del rotador
                // cuando solo una es visible.
                if (!visitedIndices.has(i)) return null
                return (
                  <Link
                    key={vehicle.slug}
                    href={vehicle.detailHref}
                    aria-hidden={i !== index}
                    tabIndex={i === index ? 0 : -1}
                    className={cn(
                      'absolute inset-0 block transition-opacity duration-700 ease-out',
                      i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
                    )}
                  >
                    <Image
                      src={vehicle.src}
                      alt={vehicle.alt}
                      fill
                      sizes="(min-width: 1024px) 22vw, 60vw"
                      priority={i === 0}
                      className="object-cover"
                    />
                  </Link>
                )
              })}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-auto-darker/85 via-transparent to-transparent"
              />

              {current && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
                  {current.manufacturer && (
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-auto-text-secondary">
                      {current.manufacturer}
                    </p>
                  )}
                  <p className="font-display text-base font-bold text-auto-text">{current.title}</p>
                </div>
              )}
            </div>

            {canAutoRotate && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex flex-1 items-center gap-1.5" role="group" aria-label="Elegir vehículo destacado">
                  {vehicles.map((vehicle, i) => (
                    <button
                      key={vehicle.slug}
                      type="button"
                      aria-pressed={i === index}
                      aria-label={`Ver ${vehicle.title}`}
                      onClick={() => goToVehicle(i)}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        i === index ? 'bg-auto-accent' : 'bg-neutral-200 hover:bg-neutral-300'
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  aria-pressed={!isPlaying}
                  aria-label={isPlaying ? 'Pausar rotación automática' : 'Reanudar rotación automática'}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 fill-current">
                      <rect x="3" y="2" width="3.2" height="12" rx="0.6" />
                      <rect x="9.8" y="2" width="3.2" height="12" rx="0.6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 fill-current">
                      <path d="M4 2.5v11l10-5.5-10-5.5z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hero-showroom-in hero-showroom-in-delay-3 pointer-events-none mt-14 hidden justify-center sm:flex">
        <span className="hero-scroll-cue text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-neutral-400">
          Scroll para explorar
        </span>
      </div>

      <style jsx>{`
        .hero-showroom-in {
          animation: hero-showroom-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-showroom-in-delay-1 {
          animation-delay: 90ms;
        }
        .hero-showroom-in-delay-2 {
          animation-delay: 180ms;
        }
        .hero-showroom-in-delay-3 {
          animation-delay: 320ms;
        }
        @keyframes hero-showroom-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hero-scroll-cue {
          animation: hero-scroll-cue-pulse 2.4s ease-in-out infinite;
        }
        @keyframes hero-scroll-cue-pulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-showroom-in {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .hero-scroll-cue {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
