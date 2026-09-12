import Link from 'next/link'
import { QuickSearchForm } from '@/components/home/QuickSearchForm'
import { Reveal } from '@/components/ui/Reveal'
import { type Vehicle } from '@/types'
import { resolveEntityDisplayImage } from '@/lib/media'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
import { EVIDENCE_STAMP_META } from '@/lib/evidence'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ArchiveHeroCategoryChip {
  label: string
  count: number
  href: string
}

interface ArchiveHeroProps {
  vehicleCount: number
  evidenceCoveragePct: number | null
  featuredVehicles: Vehicle[]
  searchExamples?: string[]
  categoryChips?: ArchiveHeroCategoryChip[]
}

/**
 * HERO DEL ARCHIVO AUTOMOTOR
 * Concepto: "CADA DATO TIENE UN ORIGEN"
 * 
 * Composición editorial asimétrica:
 * - Lado izquierdo: identificador de archivo, título, texto, buscador
 * - Lado derecho: fichas técnicas reales que parecen documentos físicos
 * 
 * Metáfora visual: expediente, dossier, papel, tinta, sellos documentales
 */
export function ArchiveHero({ vehicleCount, evidenceCoveragePct, featuredVehicles, searchExamples, categoryChips }: ArchiveHeroProps) {
  // Tomar 2 vehículos destacados para las fichas técnicas
  const sampleVehicles = featuredVehicles.slice(0, 2)

  return (
    <section className="relative min-h-screen bg-paper overflow-hidden">
      {/* Fondo con textura sutil de papel + luz cenital suave, para que
          el "documento" tenga algo de profundidad sin caer en gradients
          evidentes (fuera del vocabulario visual del archivo). */}
      <div className="paper-texture absolute inset-0 opacity-[0.035]" aria-hidden="true" />
      <div className="paper-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="container-max relative z-10 py-16 sm:py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          
          {/* LADO IZQUIERDO: Identificador + Título + Buscador.
              NOTA (auditoría 11/09/2026): este bloque es el contenido
              crítico above-the-fold — el <h1> es el candidato natural a
              LCP. Antes estaba envuelto en <Reveal>, un client component
              que arranca en opacity:0 y solo se hace visible cuando un
              IntersectionObserver dispara (o, como red de seguridad,
              recién a los 1.5s). Eso significaba que el título/buscador
              del hero podía tardar hasta 1.5s en pintarse en conexiones
              lentas, y que Reveal forzaba a todo ArchiveHero a ser
              'use client'. Se saca el gate acá: este bloque ahora se
              pinta directo desde el servidor, sin esperar hidratación.
              El fade-in decorativo se mantiene solo para las fichas de
              vehículo del lado derecho (contenido secundario, no LCP). */}
          <div className="space-y-8 lg:sticky lg:top-8">
            {/* Identificador de archivo */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-oxide-red/30 pb-4">
              <div className="h-2 w-2 flex-shrink-0 bg-oxide-red" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/70">
                ARCHIVO AUTOMOTOR VERIFICADO
              </span>
              {evidenceCoveragePct !== null && evidenceCoveragePct > 0 && (
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-archive-green sm:ml-auto">
                  {evidenceCoveragePct}% CON FUENTE CITADA
                </span>
              )}
            </div>

            {/* Título principal */}
            <div className="space-y-4">
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] text-ink">
                Cada dato
                <br />
                <span className="text-oxide-red">tiene un origen.</span>
              </h1>
              <p className="font-sans text-lg sm:text-xl text-ink/70 max-w-xl leading-relaxed">
                {vehicleCount} fichas técnicas con fuentes verificadas. 
                Especificaciones de fabricante, documentación de ingeniería, 
                sellos de evidencia. No es un catálogo, es un archivo.
              </p>
            </div>

            {/* Buscador */}
            <div className="space-y-5">
              <QuickSearchForm examples={searchExamples} />

              {/* Pestañas de carpeta: acceso directo por categoría,
                  con volumen real del catálogo. Metáfora: separadores
                  de un archivador físico, cada uno con su etiqueta. */}
              {categoryChips && categoryChips.length > 0 && (
                <div
                  className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  role="list"
                  aria-label="Categorías principales del archivo"
                >
                  {categoryChips.map((chip) => (
                    <Link
                      key={chip.href}
                      href={chip.href}
                      role="listitem"
                      className="group/tab flex flex-shrink-0 items-baseline gap-1.5 rounded-t-md border border-b-0 border-border bg-surface-alt px-3 py-2 transition-colors hover:bg-oxide-red hover:border-oxide-red"
                    >
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink group-hover/tab:text-white">
                        {chip.label}
                      </span>
                      <span className="font-mono text-[10px] text-ink/50 group-hover/tab:text-white/80">
                        {chip.count}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/vehiculos"
                  className="font-mono text-xs uppercase tracking-[0.15em] text-ink/60 hover:text-ink transition-colors border-b border-transparent hover:border-ink/30"
                >
                  Explorar archivo completo →
                </Link>
                <Link
                  href="/comparar"
                  className="font-mono text-xs uppercase tracking-[0.15em] text-ink/60 hover:text-ink transition-colors border-b border-transparent hover:border-ink/30"
                >
                  Comparar fichas →
                </Link>
              </div>
            </div>
          </div>

          {/* LADO DERECHO: Fichas técnicas como documentos físicos */}
          <div className="relative space-y-6 lg:mt-8">
            {sampleVehicles.map((vehicle, index) => {
              const image = resolveEntityDisplayImage(vehicle)
              const powerLabel = parsePowerHp(vehicle)
              const priceLabel = parsePriceUsd(vehicle)
              const evidenceLevel = vehicle.evidence?.level

              return (
                <Reveal key={vehicle.slug} delay={300 + index * 150}>
                  <div className="relative">
                    {/* Hojas fantasma: sugieren que hay más fichas apiladas
                        debajo de la que se ve, sin cargar contenido real de
                        más (serían datos inventados) — es puro decorado. */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 rounded-sm border border-border/50 bg-surface-alt/70 [transform:rotate(4deg)_translate(6px,8px)]"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 rounded-sm border border-border/70 bg-surface-alt/90 [transform:rotate(-3deg)_translate(-4px,5px)]"
                    />
                    <div
                      className="group relative z-10 bg-surface-card border border-border p-6 shadow-md transition-[transform,box-shadow] duration-300 ease-out [transform:rotate(var(--card-rotate))] hover:shadow-xl hover:[transform:rotate(0deg)_translateY(-4px)] motion-reduce:transition-none motion-reduce:hover:[transform:none]"
                      style={{ '--card-rotate': index === 0 ? '-1deg' : '1deg' } as React.CSSProperties}
                    >
                    {/* Cabecera del documento */}
                    <div className="flex items-start justify-between mb-4 pb-3 border-b border-border/50">
                      <div className="space-y-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
                          FICHA TÉCNICA
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
                          REF: {vehicle.slug.toUpperCase()}
                        </p>
                      </div>
                      {evidenceLevel && (
                        <div className={cn(
                          'flex items-center gap-1.5 px-2 py-1 border',
                          EVIDENCE_STAMP_META[evidenceLevel].className
                        )}>
                          <span className="font-mono text-[9px] uppercase tracking-wider">
                            {EVIDENCE_STAMP_META[evidenceLevel].shortLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contenido de la ficha */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        {/* Imagen pequeña */}
                        {image && (
                          <div className="relative w-20 h-16 flex-shrink-0 overflow-hidden bg-paper border border-border/50">
                            <Image
                              src={image.src}
                              alt={vehicle.title}
                              fill
                              className="object-cover"
                              sizes="80px"
                              priority={index === 0}
                            />
                          </div>
                        )}
                        
                        {/* Título y datos */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <h3 className="font-serif text-lg font-semibold text-ink leading-tight">
                            {vehicle.title}
                          </h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-ink/60">
                            {vehicle.manufacturer && (
                              <span>{vehicle.manufacturer}</span>
                            )}
                            {vehicle.class && (
                              <span>· {vehicle.class}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Especificaciones técnicas */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                        {powerLabel && (
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink/40 mb-1">
                              Potencia
                            </p>
                            <p className="font-mono text-sm font-semibold text-ink">
                              {powerLabel}
                            </p>
                          </div>
                        )}
                        {priceLabel && (
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink/40 mb-1">
                              Precio
                            </p>
                            <p className="font-mono text-sm font-semibold text-ink">
                              {priceLabel}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pie del documento */}
                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                      <p className="font-mono text-[9px] text-ink/40">
                        {(vehicle.updatedAt || vehicle.createdAt) ? new Date(vehicle.updatedAt || vehicle.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }).toUpperCase() : 'FECHA NO DISPONIBLE'}
                      </p>
                      <Link
                        href={`/vehiculos/${vehicle.slug}`}
                        prefetch={false}
                        className="font-mono text-[10px] uppercase tracking-[0.15em] text-oxide-red hover:text-ink transition-colors"
                      >
                        Ver ficha completa →
                      </Link>
                    </div>

                    {/* Sello de verificación (animación al cargar) */}
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 border-2 border-archive-green/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <span className="font-serif text-archive-green text-lg">✓</span>
                    </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cue de scroll: invita a seguir bajando al índice del archivo.
          Puramente decorativo — no cambia foco ni orden de tabulación. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 lg:flex lg:flex-col lg:items-center lg:gap-2"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/30">
          Seguir explorando
        </span>
        <svg
          className="scroll-cue-arrow h-4 w-4 text-ink/30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>

      {/* Línea decorativa inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent" />
    </section>
  )
}
