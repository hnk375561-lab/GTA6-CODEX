import Link from 'next/link'
import { EntityImage } from '@/components/entities/EntityImage'
import { resolveEntityDisplayImage } from '@/lib/media'
import type { SimilarVehicle } from '@/lib/vehicle-similar'

interface SimilarVehiclesPanelProps {
  items: SimilarVehicle[]
}

/**
 * Lista de "vehículos similares" (oportunidad #6 del audit) — mismo
 * lenguaje visual que `RelationsPanel` (avatar + título + link), pero
 * sin agrupar por tipo de relación, porque acá el criterio es uno solo
 * (misma categoría amplia, ordenado por cercanía de potencia) y ya está
 * comunicado por el heading del panel contenedor. Componente puro:
 * no decide a quién mostrar, solo renderiza lo que `getSimilarVehicles`
 * ya calculó.
 */
export function SimilarVehiclesPanel({ items }: SimilarVehiclesPanelProps) {
  if (items.length === 0) return null

  return (
    <ul className="space-y-2">
      {items.map(({ vehicle, powerDiff }) => (
        <li key={vehicle.slug}>
          <Link
            href={`/vehiculos/${vehicle.slug}`}
            className="group flex items-center gap-3 rounded-md border border-dashed border-transparent px-2 py-2 -mx-2 transition-colors duration-200 hover:border-edge-strong hover:bg-auto-darker/40"
          >
            <EntityImage
              entity={vehicle}
              image={resolveEntityDisplayImage(vehicle)}
              variant="avatar"
              className="h-11 w-11 shrink-0 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="link-underline truncate text-sm text-neutral-900 group-hover:text-auto-accent">
                {vehicle.title}
              </span>
              <span className="truncate text-xs text-neutral-500">
                {vehicle.manufacturer}
                {powerDiff !== null && (
                  <>
                    {' · '}
                    {powerDiff === 0 ? 'misma potencia' : `${powerDiff} hp de diferencia`}
                  </>
                )}
              </span>
            </div>
            <span
              aria-hidden="true"
              className="ml-auto shrink-0 text-neutral-500/40 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-auto-accent group-hover:opacity-100"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
