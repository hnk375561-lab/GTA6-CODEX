'use client'

import Link from 'next/link'
import { type Vehicle } from '@/types'
import { resolveEntityDisplayImage } from '@/lib/media'

import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface FeaturedDossiersProps {
  vehicles: Vehicle[]
}

/**
 * DOSSIERS DESTACADOS
 * Reemplaza FeaturedCarousel con presentación documental
 * 
 * Concepto: fichas destacadas del archivo, presentación tipo
 * expedientes seleccionados, no carrusel sino grid editorial
 */
export function FeaturedDossiers({ vehicles }: FeaturedDossiersProps) {
  if (!vehicles.length) return null

  const featured = vehicles.slice(0, 8)

  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-paper border-t border-border">
      <div className="container-max">
        {/* Encabezado de sección */}
        <div className="mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
              DOSSIERS DESTACADOS
            </span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink text-center">
            Fichas destacadas
          </h2>
          <p className="font-sans text-ink/60 text-center mt-4 max-w-2xl mx-auto">
            Expedientes seleccionados por su relevancia técnica, 
            cantidad de datos verificados y actualidad de la información.
          </p>
        </div>

        {/* Grid editorial de dossiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((vehicle, index) => {
            const image = resolveEntityDisplayImage(vehicle)
            const priceLabel = vehicle.price
            const evidenceLevel = vehicle.evidence?.level

            return (
              <Link
                key={vehicle.slug}
                href={`/vehiculos/${vehicle.slug}`}
                prefetch={false}
                className="group/dossier relative bg-surface-card border border-border overflow-hidden hover:border-oxide-red/50 transition-all duration-200"
                style={{
                  animationDelay: `${index * 60}ms`,
                }}
              >
                {/* Cabecera del dossier */}
                <div className="relative aspect-[4/5] overflow-hidden bg-paper">
                  {image && (
                    <Image
                      src={image.src}
                      alt=""
                      fill
                      className="object-cover group-hover/dossier:scale-105 transition-transform duration-500"
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                    />
                  )}
                  
                  {/* Overlay con información */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent opacity-0 group-hover/dossier:opacity-100 transition-opacity duration-300" />
                  
                  {/* Sello de evidencia */}
                  {evidenceLevel && (
                    <div className={cn(
                      'absolute top-3 left-3 font-mono text-[9px] uppercase tracking-wider px-2 py-1 border bg-white/90 backdrop-blur-sm',
                      EVIDENCE_STAMP_META[evidenceLevel].className
                    )}>
                      {EVIDENCE_STAMP_META[evidenceLevel].shortLabel}
                    </div>
                  )}

                  {/* Información que aparece en hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover/dossier:opacity-100 transition-opacity duration-300">
                    <h3 className="font-serif text-base font-semibold text-white leading-tight mb-2 line-clamp-2">
                      {vehicle.title}
                    </h3>
                    {vehicle.manufacturer && (
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/80">
                        {vehicle.manufacturer}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pie del dossier */}
                <div className="p-4 border-t border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-sm font-semibold text-ink leading-tight line-clamp-2 mb-1">
                        {vehicle.title}
                      </h3>
                      {vehicle.manufacturer && (
                        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/50">
                          {vehicle.manufacturer}
                        </p>
                      )}
                    </div>
                    {priceLabel && (
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono text-[9px] uppercase tracking-wider text-ink/40">
                          Precio
                        </p>
                        <p className="font-mono text-xs font-semibold text-ink">
                          {priceLabel}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Referencia de archivo */}
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="font-mono text-[9px] text-ink/40">
                      REF: {vehicle.slug.slice(0, 6).toUpperCase()}
                    </span>
                    <span className="font-mono text-[9px] text-oxide-red uppercase tracking-wider group-hover/dossier:translate-x-1 transition-transform">
                      Ver ficha →
                    </span>
                  </div>
                </div>

                {/* Marca de destacado */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-oxide-red rounded-full opacity-0 group-hover/dossier:opacity-100 transition-opacity" />
              </Link>
            )
          })}
        </div>

        {/* Link al archivo completo */}
        <div className="mt-12 text-center">
          <Link
            href="/vehiculos"
            prefetch={false}
            className="font-mono text-xs uppercase tracking-[0.15em] text-ink/60 hover:text-ink transition-colors inline-flex items-center gap-2 border-b border-transparent hover:border-ink/30"
          >
            Explorar {vehicles.length} fichas en el archivo completo →
          </Link>
        </div>
      </div>
    </section>
  )
}
