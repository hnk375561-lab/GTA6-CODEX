'use client'

import Link from 'next/link'
import { type Vehicle } from '@/types'
import { resolveEntityDisplayImage } from '@/lib/media'
import { parsePowerHp } from '@/lib/vehicle-power'
import { EVIDENCE_STAMP_META } from '@/lib/evidence'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface VehicleArchiveIndexProps {
  vehicles: Vehicle[]
}

/**
 * ÍNDICE DE VEHÍCULOS DEL ARCHIVO
 * Reemplaza el concepto de radar por un índice documental organizado
 * 
 * Concepto: estantería de fichas, organización por categorías,
 * presentación tipo dossier/ expediente
 */
export function VehicleArchiveIndex({ vehicles }: VehicleArchiveIndexProps) {
  if (!vehicles.length) return null

  // Agrupar por categoría
  const groupedByCategory = vehicles.reduce((acc, vehicle) => {
    const category = vehicle.class || 'Sin clasificar'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(vehicle)
    return acc
  }, {} as Record<string, Vehicle[]>)

  const categories = Object.entries(groupedByCategory).sort((a, b) => b[1].length - a[1].length)

  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-paper">
      <div className="container-max">
        {/* Encabezado de sección */}
        <div className="mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
              ÍNDICE DEL ARCHIVO
            </span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink text-center">
            Fichas por categoría
          </h2>
          <p className="font-sans text-ink/60 text-center mt-4 max-w-2xl mx-auto">
            {vehicles.length} vehículos organizados por tipo y clase. 
            Cada ficha incluye especificaciones técnicas, fuentes verificadas y sellos de evidencia.
          </p>
        </div>

        {/* Grid de categorías tipo estantería */}
        <div className="space-y-12">
          {categories.map(([category, categoryVehicles]) => (
            <div key={category} className="group">
              {/* Cabecera de categoría */}
              <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-border">
                <h3 className="font-serif text-xl sm:text-2xl font-semibold text-ink">
                  {category}
                </h3>
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink/50">
                  {categoryVehicles.length} fichas
                </span>
              </div>

              {/* Grid de fichas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryVehicles.slice(0, 8).map((vehicle) => {
                  const image = resolveEntityDisplayImage(vehicle)
                  const powerLabel = parsePowerHp(vehicle)
                  const evidenceLevel = vehicle.evidence?.level

                  return (
                    <Link
                      key={vehicle.slug}
                      href={`/vehiculos/${vehicle.slug}`}
                      prefetch={false}
                      className="paper-fold lift-on-hover group/vehicle relative bg-surface-card border border-border p-4 hover:border-oxide-red/50 transition-colors duration-200"
                    >
                      {/* Identificador de ficha */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink/40">
                          REF: {vehicle.slug.slice(0, 8).toUpperCase()}
                        </span>
                        {evidenceLevel && (
                          <span className={cn(
                            'font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 border',
                            EVIDENCE_STAMP_META[evidenceLevel].className
                          )}>
                            {EVIDENCE_STAMP_META[evidenceLevel].shortLabel}
                          </span>
                        )}
                      </div>

                      {/* Imagen */}
                      {image && (
                        <div className="relative aspect-[4/3] mb-3 overflow-hidden bg-paper border border-border/30">
                          <Image
                            src={image.src}
                            alt=""
                            fill
                            className="object-cover group-hover/vehicle:scale-105 transition-transform duration-300"
                            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          />
                        </div>
                      )}

                      {/* Título */}
                      <h4 className="font-serif text-base font-semibold text-ink leading-tight mb-2 line-clamp-2">
                        {vehicle.title}
                      </h4>

                      {/* Especificación clave */}
                      {powerLabel && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-ink/60">Potencia:</span>
                          <span className="font-mono text-xs font-semibold text-ink">{powerLabel}</span>
                        </div>
                      )}

                      {/* Marca de archivo */}
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-archive-green/30 rounded-full opacity-0 group-hover/vehicle:opacity-100 transition-opacity" />
                    </Link>
                  )
                })}
              </div>

              {/* Link a categoría completa */}
              {categoryVehicles.length > 8 && (
                <div className="mt-4 text-center">
                  <Link
                    href={`/categorias/${category.toLowerCase().replace(/\s+/g, '-')}`}
                    prefetch={false}
                    className="font-mono text-xs uppercase tracking-[0.15em] text-oxide-red hover:text-ink transition-colors inline-flex items-center gap-2"
                  >
                    Ver {categoryVehicles.length - 8} fichas más en {category} →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
