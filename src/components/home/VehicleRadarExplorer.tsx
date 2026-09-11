'use client'

import Link from 'next/link'
import { type Vehicle } from '@/types'
import { resolveEntityDisplayImage } from '@/lib/media'
import { parsePowerHp } from '@/lib/vehicle-power'
import { parsePriceUsd } from '@/lib/vehicle-price'
import Image from 'next/image'

interface VehicleRadarExplorerProps {
  vehicles: Vehicle[]
}

/**
 * EXPLORADOR VISUAL DE RADAR
 * - Vehículos como puntos en un espacio 2D
 * - Escala visual variable: tamaño = potencia relativa
 * - Disposición: asimétrica, con overlapping, densidad variable
 * - Datos visuales: color = segmento, tamaño = potencia
 * - RUPTURA de grilla: no es "cards en grid"
 */
export function VehicleRadarExplorer({ vehicles }: VehicleRadarExplorerProps) {
  if (!vehicles.length) return null

  // Calcular rango de potencia para escala
  const powers = vehicles
    .map((v) => {
      const powerStr = v.motor?.potencia || '0'
      const match = powerStr.match(/\d+/)
      return match ? parseInt(match[0], 10) : 0
    })
    .filter((p) => p > 0)

  const minPower = Math.min(...powers)
  const maxPower = Math.max(...powers)
  const powerRange = maxPower - minPower || 1

  const getScaleFromPower = (powerStr: string): number => {
    const match = powerStr.match(/\d+/)
    const power = match ? parseInt(match[0], 10) : 0
    // Escala de 0.6 a 2.0 (pequeño a grande)
    const normalized = (power - minPower) / powerRange
    return 0.6 + normalized * 1.4
  }

  const getColorFromSegment = (segment?: string): string => {
    if (!segment) return '#9fa8b5' // gris defecto
    const seg = segment.toLowerCase()
    if (seg.includes('lujo') || seg.includes('premium')) return '#c9a35f' // gold
    if (seg.includes('deporte') || seg.includes('performance')) return '#ff6a1a' // naranja
    if (seg.includes('eléctrico')) return '#3d84ff' // azul
    if (seg.includes('suv') || seg.includes('4x4')) return '#ff9152' // naranja soft
    return '#8a8f98' // gris acento
  }

  // Crear disposición asimétrica (no grilla)
  // Idea: algunos vehículos grandes, otros pequeños, overlapping
  const positions = vehicles.map((v, idx) => {
    const scale = getScaleFromPower(v.motor?.potencia || '0')
    // Posición pseudo-aleatoria pero determinista
    const row = Math.floor(idx / 4)
    const col = idx % 4
    
    // Offset asimétrico
    const baseX = col * 28 + (row % 2) * 14
    const baseY = row * 32 + Math.random() * 8

    return {
      x: baseX,
      y: baseY,
      scale,
      color: getColorFromSegment(v.category),
    }
  })

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-edge bg-surface-card p-6">
      {/* Canvas interactivo (simulado con posicionamiento) */}
      <div className="relative aspect-video w-full bg-surface-page rounded overflow-hidden">
        {/* Grid de fondo (reference visual) */}
        <svg
          className="absolute inset-0 w-full h-full opacity-5 pointer-events-none"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9fa8b5" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Vehículos como puntos escala variable */}
        <div className="absolute inset-0">
          {vehicles.map((vehicle, idx) => {
            const pos = positions[idx]
            const image = resolveEntityDisplayImage(vehicle)
            const size = 80 + pos.scale * 60 // 80px mín, 176px máx

            return (
              <Link
                key={`${vehicle.slug}-radar`}
                href={`/${vehicle.type}/${vehicle.slug}`}
                className="group absolute transform transition-all duration-300 hover:z-20 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-auto-accent focus:ring-offset-2"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: `translate(-50%, -50%) scale(${pos.scale})`,
                  width: `${size}px`,
                  height: `${size}px`,
                }}
              >
                {/* Contenedor visual: imagen + data */}
                <div className="relative w-full h-full rounded-lg overflow-hidden border-2 shadow-lg hover:shadow-xl transition-shadow" style={{
                  borderColor: pos.color,
                  backgroundColor: `${pos.color}15`,
                }}>
                  {/* Imagen del vehículo */}
                  {image && (
                    <Image
                      src={image}
                      alt={vehicle.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Overlay: datos en hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2">
                    <p className="text-white font-bold text-xs leading-tight line-clamp-1">{vehicle.title}</p>
                    {vehicle.motor?.potencia && (
                      <p className="text-auto-accent text-xs font-mono">{vehicle.motor.potencia}</p>
                    )}
                  </div>

                  {/* Punto de referencia (coordenada) */}
                  <div
                    className="absolute -top-3 -left-3 w-2 h-2 rounded-full border border-current"
                    style={{ color: pos.color }}
                    aria-hidden="true"
                  />
                </div>
              </Link>
            )
          })}
        </div>

        {/* Ejes tipográficos (reference) */}
        <div className="absolute left-0 bottom-0 p-3 font-mono text-xs text-neutral-500 pointer-events-none">
          Potencia →
        </div>
        <div className="absolute left-0 top-0 p-3 font-mono text-xs text-neutral-500 pointer-events-none -rotate-90 origin-top-left">
          Segmento ↑
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="mt-6 flex flex-wrap gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#c9a35f' }} />
          <span className="text-neutral-600">Lujo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff6a1a' }} />
          <span className="text-neutral-600">Deporte</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3d84ff' }} />
          <span className="text-neutral-600">Eléctrico</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff9152' }} />
          <span className="text-neutral-600">SUV</span>
        </div>
      </div>
    </div>
  )
}
