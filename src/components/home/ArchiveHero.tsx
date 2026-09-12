'use client'

import Link from 'next/link'
import { QuickSearchForm } from '@/components/home/QuickSearchForm'
import { Reveal } from '@/components/ui/Reveal'
import { type Vehicle } from '@/types'
import { resolveEntityDisplayImage } from '@/lib/media'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ArchiveHeroProps {
  vehicleCount: number
  evidenceCoveragePct: number | null
  featuredVehicles: Vehicle[]
  searchExamples?: string[]
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
export function ArchiveHero({ vehicleCount, evidenceCoveragePct, featuredVehicles, searchExamples }: ArchiveHeroProps) {
  // Tomar 2 vehículos destacados para las fichas técnicas
  const sampleVehicles = featuredVehicles.slice(0, 2)

  return (
    <section className="relative min-h-screen bg-paper overflow-hidden">
      {/* Fondo con textura sutil de papel */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314110C' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} aria-hidden="true" />

      <div className="container-max relative z-10 py-16 sm:py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          
          {/* LADO IZQUIERDO: Identificador + Título + Buscador */}
          <div className="space-y-8 lg:sticky lg:top-8">
            {/* Identificador de archivo */}
            <Reveal>
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
            </Reveal>

            {/* Título principal */}
            <Reveal delay={100}>
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
            </Reveal>

            {/* Buscador */}
            <Reveal delay={200}>
              <div className="space-y-4">
                <QuickSearchForm examples={searchExamples} />
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
            </Reveal>
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
                  <div
                    className="group relative bg-surface-card border border-border p-6 shadow-sm transition-transform duration-300 ease-out [transform:rotate(var(--card-rotate))] hover:[transform:rotate(0deg)_translateY(-4px)] motion-reduce:transition-none motion-reduce:hover:[transform:none]"
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
                              alt=""
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
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>

      {/* Línea decorativa inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent" />
    </section>
  )
}
