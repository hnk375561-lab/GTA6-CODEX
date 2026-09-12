'use client'

import Link from 'next/link'
import { type Vehicle } from '@/types'
import { resolveEntityDisplayImage } from '@/lib/media'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ManufacturerArchiveProps {
  vehicles: Vehicle[]
}

/**
 * ESTANTERÍA DE FABRICANTES
 * Reemplaza el concepto de universo visual por organización documental
 * 
 * Concepto: cada fabricante como una carpeta del archivo,
 * con sus fichas organizadas internamente
 */
export function ManufacturerArchive({ vehicles }: ManufacturerArchiveProps) {
  if (!vehicles.length) return null

  // Agrupar por fabricante
  const groupedByManufacturer = vehicles.reduce((acc, vehicle) => {
    const manufacturer = vehicle.manufacturer || 'Sin marca'
    if (!acc[manufacturer]) {
      acc[manufacturer] = []
    }
    acc[manufacturer].push(vehicle)
    return acc
  }, {} as Record<string, Vehicle[]>)

  const manufacturers = Object.entries(groupedByManufacturer)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12) // Top 12 fabricantes

  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-paper border-t border-border">
      <div className="container-max">
        {/* Encabezado de sección */}
        <div className="mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
              CARPETAS DEL ARCHIVO
            </span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink text-center">
            Fabricantes
          </h2>
          <p className="font-sans text-ink/60 text-center mt-4 max-w-2xl mx-auto">
            {manufacturers.length} marcas con fichas técnicas verificadas. 
            Cada carpeta contiene la documentación completa de sus modelos.
          </p>
        </div>

        {/* Grid de carpetas de fabricantes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {manufacturers.map(([manufacturer, manufacturerVehicles], index) => {
            const sampleVehicle = manufacturerVehicles[0]
            const sampleImage = resolveEntityDisplayImage(sampleVehicle)

            return (
              <Link
                key={manufacturer}
                href={`/fabricantes#${manufacturer.toLowerCase().replace(/\s+/g, '-')}`}
                prefetch={false}
                className="paper-fold group/manufacturer relative bg-surface-card border border-border p-5 transition-[border-color,box-shadow,transform] duration-200 hover:border-archive-green/50 hover:shadow-lg hover:[transform:translateY(-3px)_rotate(-0.3deg)]"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Cabecera de carpeta */}
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-semibold text-ink leading-tight">
                      {manufacturer}
                    </h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/50">
                      {manufacturerVehicles.length} fichas
                    </p>
                  </div>
                  {/* Icono de carpeta */}
                  <svg 
                    className="w-5 h-5 text-ink/30 group-hover/manufacturer:text-archive-green/60 transition-colors" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>

                {/* Muestra visual */}
                {sampleImage && (
                  <div className="relative aspect-[16/10] mb-4 overflow-hidden bg-paper border border-border/30">
                    <Image
                      src={sampleImage.src}
                      alt=""
                      fill
                      className="object-cover group-hover/manufacturer:scale-105 transition-transform duration-300"
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                    {/* Overlay sutil */}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/10 to-transparent opacity-0 group-hover/manufacturer:opacity-100 transition-opacity duration-200" />
                  </div>
                )}

                {/* Lista de modelos destacados */}
                <div className="space-y-1.5">
                  {manufacturerVehicles.slice(0, 3).map((vehicle) => (
                    <div key={vehicle.slug} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-ink/30 rounded-full" />
                      <p className="font-sans text-xs text-ink/70 truncate">
                        {vehicle.title}
                      </p>
                    </div>
                  ))}
                  {manufacturerVehicles.length > 3 && (
                    <p className="font-mono text-[10px] text-ink/40 mt-2">
                      +{manufacturerVehicles.length - 3} modelos más
                    </p>
                  )}
                </div>

                {/* Indicador de archivo */}
                <div className="absolute top-3 right-3 font-mono text-[8px] uppercase tracking-wider text-ink/30">
                  {String(index + 1).padStart(2, '0')}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
