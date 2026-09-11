'use client'

import Link from 'next/link'
import { type Vehicle } from '@/types'
import { resolveEntityDisplayImage } from '@/lib/media'
import Image from 'next/image'
import { useMemo } from 'react'

interface ManufacturerVisualizationProps {
  vehicles: Vehicle[]
}

/**
 * COLECCIONES POR FABRICANTE
 * - Agrupa vehículos por marca
 * - Cada marca como "universo visual" con escala variable
 * - NO cards iguales: disposición orgánica, algunos vehículos dominan
 * - Densidad visual como metáfora de catálogo (marca grande = más vehículos)
 * - RUPTURA: cada marca tiene su propio "peso visual"
 */
export function ManufacturerVisualization({ vehicles }: ManufacturerVisualizationProps) {
  // Agrupar por fabricante
  const vehiclesByManufacturer = useMemo(() => {
    const grouped: Record<string, Vehicle[]> = {}
    
    vehicles.forEach((v) => {
      const manufacturer = v.manufacturer?.nombre || 'Sin marca'
      if (!grouped[manufacturer]) {
        grouped[manufacturer] = []
      }
      grouped[manufacturer].push(v)
    })

    // Ordenar por cantidad (marcas con más vehículos primero)
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 12) // Top 12 marcas
  }, [vehicles])

  if (Object.keys(vehiclesByManufacturer).length === 0) return null

  return (
    <div className="space-y-8">
      {Object.entries(vehiclesByManufacturer).map(([manufacturer, manufacturerVehicles], idx) => {
        // Escala del bloque según cantidad de vehículos
        const scale = Math.min(manufacturerVehicles.length / 10, 2.5)
        const columns = Math.max(2, Math.ceil(Math.sqrt(manufacturerVehicles.length)))

        return (
          <div
            key={manufacturer}
            className="group relative transition-transform duration-300 hover:scale-105"
            style={{
              animation: `slideIn 0.6s ease-out ${idx * 80}ms both`,
            }}
          >
            {/* Marca como encabezado */}
            <div className="mb-4 flex items-baseline gap-4">
              <h3 className="font-display text-2xl sm:text-3xl font-bold">
                {manufacturer}
              </h3>
              <span className="font-mono text-xs text-neutral-500 tracking-widest">
                {manufacturerVehicles.length} vehículos
              </span>
            </div>

            {/* Grilla orgánica (no uniforme) */}
            <div
              className="grid gap-3 transition-all duration-300"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${100 + scale * 40}px, 1fr))`,
              }}
            >
              {manufacturerVehicles.slice(0, 12).map((vehicle, i) => {
                // Algunos vehículos ocupan más espacio (el primero y cada 3ro)
                const isLarge = i === 0 || i % 4 === 0
                const image = resolveEntityDisplayImage(vehicle)

                return (
                  <Link
                    key={`${vehicle.slug}-mfg`}
                    href={`/${vehicle.type}/${vehicle.slug}`}
                    className={`relative group overflow-hidden rounded-lg border border-edge/50 transition-all duration-300 hover:border-auto-accent hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-auto-accent ${
                      isLarge ? 'col-span-2 row-span-2' : ''
                    }`}
                  >
                    {/* Imagen */}
                    {image && (
                      <Image
                        src={image}
                        alt={vehicle.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    )}

                    {/* Overlay oscuro + texto */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                      <p className="text-white font-bold text-sm leading-tight line-clamp-2">
                        {vehicle.title}
                      </p>
                      {vehicle.motor?.potencia && (
                        <p className="text-auto-accent text-xs font-mono mt-1">
                          {vehicle.motor.potencia}
                        </p>
                      )}
                    </div>

                    {/* Badge de catálogo */}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-mono text-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity">
                      ✓
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* CSS para animación entrada */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
