'use client'

import dynamic from 'next/dynamic'
import type { Entity } from '@/types'

interface LeonidaMapExplorerProps {
  /** Todas las entidades mapeables (ubicaciones, armas, vehículos, misiones, objetos). */
  entities: Entity[]
}

/**
 * Leaflet necesita `window`/`document` al montarse, así que el mapa en sí
 * se carga únicamente en el cliente, sin server-side rendering, para evitar
 * errores de hidratación en Next.js.
 *
 * V1 vs V2: por defecto se usa V1 (estable, en producción desde siempre).
 * V2 agrega clustering de marcadores y un panel de filtros más completo.
 * Se activa con NEXT_PUBLIC_MAP_V2=true en el entorno (ver .env.local o
 * las env vars del proyecto en Vercel) sin tocar código.
 */
const useMapV2 = process.env.NEXT_PUBLIC_MAP_V2 === 'true'

const LeonidaMapCanvas = dynamic(
  () =>
    useMapV2
      ? import('./LeonidaMapCanvasV2').then((mod) => mod.LeonidaMapCanvasV2)
      : import('./LeonidaMapCanvas').then((mod) => mod.LeonidaMapCanvas),
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
