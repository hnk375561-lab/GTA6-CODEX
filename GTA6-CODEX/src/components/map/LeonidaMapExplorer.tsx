'use client'

import dynamic from 'next/dynamic'
import type { Entity } from '@/types'

interface LeonidaMapExplorerProps {
  /** Todas las entidades mapeables (ubicaciones, armas, vehículos, misiones, objetos). */
  entities: Entity[]
}

/**
 * Leaflet necesita `window`/`document` al montarse, así que el mapa en sí
 * (`LeonidaMapCanvas`) se carga únicamente en el cliente, sin server-side
 * rendering, para evitar errores de hidratación en Next.js.
 */
const LeonidaMapCanvas = dynamic(
  () => import('./LeonidaMapCanvas').then((mod) => mod.LeonidaMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex h-[520px] items-center justify-center rounded-xl border border-gta-border bg-gta-card text-sm text-gta-text-tertiary">
          Cargando mapa…
        </div>
        <div className="rounded-xl border border-gta-border bg-gta-card p-4 md:p-6" />
      </div>
    ),
  }
)

export function LeonidaMapExplorer({ entities }: LeonidaMapExplorerProps) {
  return <LeonidaMapCanvas entities={entities} />
}
