'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { WordRotate } from '@/components/ui/WordRotate'
import { type HeroVehicleShowcaseItem } from '@/components/home/HeroVehicleShowcaseV2'
import { cn } from '@/lib/utils'

/**
 * HERO SHOWROOM — rediseño radical del hero (sept. 2026).
 *
 * Reemplaza el hero centrado/tipográfico anterior (headline + subtítulo +
 * contador de stats + buscador + 10 chips + carrusel horizontal, todo
 * apilado y centrado) por una composición asimétrica, oscura y
 * cinematográfica en la línea de un showroom automotriz digital:
 * vehículo grande a la derecha, headline editorial enorme abajo a la
 * izquierda, un solo CTA primario, y nada de relleno.
 *
 * Decisiones clave (por qué NO es una copia 1:1 de la spec original):
 *
 * - Este sitio es un catálogo/comparador de +250 vehículos de decenas de
 *   marcas, no la web de un concesionario de un solo auto — así que "el
 *   vehículo" del hero es un rotador entre los `featured` con foto real
 *   (mismo dato que ya resolvía el hero viejo, `heroShowcaseVehicles`),
 *   con una franja de puntos abajo para saltar manualmente entre ellos.
 * - La navegación completa (Vehículos/Fabricantes/Guías/Comparar/
 *   Galería/Mapa) ya vive en `<Header />` (global, fuera de este
 *   componente) — así que el hero NO duplica un nav propio, solo un
 *   eyebrow de marca/fecha. Menos elementos, cero redundancia.
 * - El buscador (`QuickSearchForm`) y los 10 chips (`HeroQuickLinks`) se
 *   sacan del hero (competían visualmente con el CTA y son exactamente
 *   el tipo de "panel de dashboard" que la spec pide evitar). El
 *   buscador completo sigue disponible en `/buscar` — el CTA secundario
 *   linkea ahí, no se pierde funcionalidad, solo cambia dónde vive.
 * - El bloque de 3 stats grandes (Vehículos/Fabricantes/% evidencia) se
 *   reemplaza por una sola línea chica de metadata — el dato de mayor
 *   valor real (% con fuente citada) queda como acento arriba a la
 *   derecha, el resto baja a una caption chica bajo el CTA.
 * - `text-gradient-vice` y `WordRotate` se reutilizan tal cual (mismo
 *   copy, "Cada {marca}, con fuente citada") — la marca/mensaje no
 *   cambia, solo la presentación, tal como pide la spec de rediseño.
 *
 * Tokens de color: `auto-dark`/`auto-darker`/`auto-text`/`auto-accent`
 * son los tokens ESTÁTICOS (no theme-aware) que el propio proyecto ya
 * usa para paneles oscuros decorativos fuera del dashboard (ver
 * tailwind.config.js) — no son un valor inventado para este componente,
 * es el mecanismo ya establecido para esto exacto.
 *
 * CORRECCIONES (auditoría de producción, ver
 * HERO_HOME_PRODUCTION_AUDIT.txt — hallazgos P0/P1):
 *
 * 1. Las N imágenes del rotador se montaban TODAS al cargar la página
 *    (una por vehículo, superpuestas con opacity 0/100). Como el
 *    contenedor está en el viewport inicial, el lazy-loading nativo de
 *    `next/image` no difería nada: las 4 fotos se descargaban en la
 *    carga inicial aunque solo una fuera visible. Ahora solo se monta
 *    la imagen actual + las ya visitadas (`visitedIndices`): la primera
 *    pesa lo mismo (con `priority`), pero la 2ª/3ª/4ª entran recién
 *    cuando el rotador llega a ellas, repartiendo el costo de red en
 *    vez de cargarlo entero de una.
 * 2. El rotador automático (cada 5.2s) solo se detenía con
 *    `prefers-reduced-motion`. WCAG 2.2.2 (Pause, Stop, Hide) exige un
 *    mecanismo EN LA PÁGINA para pausar contenido que se mueve solo por
 *    más de 5s, independiente de la preferencia de sistema — ahora se
 *    pausa también con hover/focus dentro del hero y hay un botón
 *    pausar/reanudar explícito junto a los puntos de navegación.
 * 3. Los puntos de navegación usaban `role="tablist"`/`role="tab"`, que
 *    en el patrón ARIA APG implica soporte de flechas de teclado entre
 *    tabs — acá no lo había (solo Tab secuencial), lo cual es un
 *    contrato de accesibilidad roto para quien navegue con lector de
 *    pantalla esperando ese patrón. Se reemplaza por `role="group"` +
 *    `aria-pressed` por botón, que describe con precisión el
 *    comportamiento real (un grupo de botones independientes).
 */

export interface HeroShowroomProps {
  vehicles: HeroVehicleShowcaseItem[]
  siteName: string
  lastUpdateLabel: string | null
  totalVehicles: number
  totalManufacturers: number
  evidenceCoveragePct: number | null
  headlineBrands: string[]
  headlineLead: string
  headlineTail: string
  subtitle: string
  catalogHref: string
  searchHref: string
}

const ROTATE_MS = 5200

export function HeroShowroom({
  vehicles,
  siteName,
  lastUpdateLabel,
  totalVehicles,
  totalManufacturers,
  evidenceCoveragePct,
  headlineBrands,
  headlineLead,
  headlineTail,
  subtitle,
  catalogHref,
  searchHref,
}: HeroShowroomProps) {
  const [index, setIndex] = useState(0)
  // Inicializador perezoso (no un efecto): lee `prefers-reduced-motion`
  // directo en el primer render, así el rotador nunca arranca "de
  // prueba" para frenarse un tick después — evita el patrón
  // set-state-en-efecto que el lint del propio repo (react-hooks) marca
  // como error (cascading renders innecesarios).
  const [isPlaying, setIsPlaying] = useState(
    () => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const [isPaused, setIsPaused] = useState(false)
  // Qué imágenes ya se mostraron al menos una vez — solo esas se montan
  // en el DOM (ver nota de corrección #1 en el comentario de arriba).
  // Se actualiza en el mismo evento que cambia `index` (ver `goToVehicle`
  // más abajo), nunca en un efecto separado, por la misma razón.
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

  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-auto-darker ring-1 ring-white/5">
      {/* Glow ambiental contenido — reemplaza <HeroAura /> (pensado para
          el hero claro anterior); acá es solo un radial sutil detrás del
          vehículo, nunca un gradiente que tape media pantalla (ver spec
          §19). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/3 h-[34rem] w-[34rem] rounded-full bg-auto-accent/10 blur-[110px]"
      />

      <div className="relative z-10 grid min-h-[72vh] gap-10 p-6 sm:p-10 lg:min-h-[78vh] lg:grid-cols-12 lg:gap-6 lg:p-14">
        {/* Eyebrow: marca + fecha, y el acento de confianza a la derecha.
            No es un navbar — la navegación completa vive en <Header />. */}
        <div className="hero-showroom-in flex items-center justify-between lg:col-span-12">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-auto-text-secondary">
            {siteName}
            {lastUpdateLabel && (
              <>
                {' '}
                <span aria-hidden="true" className="text-auto-text-secondary/50">·</span>{' '}
                <span className="normal-case tracking-normal">Actualizado {lastUpdateLabel}</span>
              </>
            )}
          </p>
          {evidenceCoveragePct !== null && evidenceCoveragePct > 0 && (
            <p className="hidden text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-auto-accent sm:block">
              {evidenceCoveragePct}% con fuente citada
            </p>
          )}
        </div>

        {/* Headline editorial + CTA, alineados abajo a la izquierda. */}
        <div className="hero-showroom-in hero-showroom-in-delay-1 flex flex-col justify-end lg:col-span-7 lg:row-start-2">
          <h1 className="font-display text-5xl font-bold leading-[1.03] tracking-tight text-auto-text sm:text-6xl lg:text-[5.25rem]">
            {headlineLead} <WordRotate words={headlineBrands} className="text-gradient-vice" />
            {', '}
            <span className="block">{headlineTail}</span>
          </h1>

          <p className="mt-6 max-w-md text-base text-auto-text-secondary sm:text-lg">{subtitle}</p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={catalogHref}
              className="group inline-flex items-center gap-2 border-b-2 border-auto-accent pb-1 text-base font-semibold text-auto-text transition-colors hover:text-auto-accent"
            >
              Ver el catálogo
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href={searchHref}
              className="text-sm font-semibold text-auto-text-secondary underline decoration-auto-text-secondary/40 underline-offset-4 transition-colors hover:text-auto-text"
            >
              Buscar un modelo puntual
            </Link>
          </div>

          {totalVehicles > 0 && (
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-auto-text-secondary/70">
              {totalVehicles} vehículos · {totalManufacturers} marcas
            </p>
          )}
        </div>

        {/* El vehículo — protagonista, rota entre los `featured` con foto
            real. Un solo <Link> visible a la vez (opacity), nunca varios
            superpuestos clickeables. `onMouseEnter/Leave` + `onFocus/Blur`
            pausan el autoplay mientras el usuario interactúa con esta zona
            (WCAG 2.2.2, ver corrección #2 arriba). */}
        <div
          className="hero-showroom-in hero-showroom-in-delay-2 relative lg:col-span-5 lg:row-span-2 lg:row-start-1"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setIsPaused(false)
          }}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl sm:aspect-[16/10] lg:aspect-auto lg:h-full">
            {vehicles.map((vehicle, i) => {
              // Solo se monta la imagen actual + las ya visitadas: evita
              // descargar de entrada las N fotos del rotador cuando solo
              // una es visible (corrección #1 arriba).
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
                    sizes="(min-width: 1024px) 40vw, 90vw"
                    priority={i === 0}
                    className="object-cover"
                  />
                </Link>
              )
            })}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-auto-darker/80 via-transparent to-transparent"
            />

            {current && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-5">
                {current.manufacturer && (
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-auto-text-secondary">
                    {current.manufacturer}
                  </p>
                )}
                <p className="font-display text-xl font-bold text-auto-text">{current.title}</p>
                {(current.powerLabel || current.secondaryStatLabel) && (
                  <p className="mt-1 text-xs text-auto-text-secondary">
                    {[current.powerLabel, current.secondaryStatLabel].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {vehicles.length > 1 && (
            <div className="mt-4 flex items-center gap-3">
              {/* `role="group"` en vez del `role="tablist"`/`"tab"` anterior:
                  ese patrón ARIA implica navegación con flechas entre tabs
                  que este control nunca implementó (Tab secuencial nomás) —
                  ver corrección #3 arriba. `aria-pressed` describe el
                  estado real: un botón que puede estar activo o no. */}
              <div className="flex flex-1 items-center gap-2" role="group" aria-label="Elegir vehículo destacado">
                {vehicles.map((vehicle, i) => (
                  <button
                    key={vehicle.slug}
                    type="button"
                    aria-pressed={i === index}
                    aria-label={`Ver ${vehicle.title}`}
                    onClick={() => goToVehicle(i)}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      i === index ? 'bg-auto-accent' : 'bg-white/10 hover:bg-white/25'
                    )}
                  />
                ))}
              </div>
              {canAutoRotate && (
                <button
                  type="button"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  aria-pressed={!isPlaying}
                  aria-label={isPlaying ? 'Pausar rotación automática' : 'Reanudar rotación automática'}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-auto-text-secondary transition-colors hover:bg-white/10 hover:text-auto-text"
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
              )}
            </div>
          )}
        </div>
      </div>

      <div className="hero-showroom-in hero-showroom-in-delay-3 pointer-events-none absolute inset-x-0 bottom-4 hidden justify-center sm:flex">
        <span className="hero-scroll-cue text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-auto-text-secondary/60">
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
