import { performanceToScale } from '@/lib/vehicle-performance'

/**
 * Barra de rendimiento reutilizable (velocidad/aceleración/manejo/frenado).
 * Antes vivía solo dentro de EntityMetadata; se extrae acá para
 * reutilizarla también en el comparador de vehículos (VehicleCompareSheet),
 * sin duplicar el marcado ni la lógica de escala.
 */
export function StatBar({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  const scale = performanceToScale(value)

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-neutral-500">{label}</span>
        <span className="font-medium text-neutral-900">{value}</span>
      </div>
      {scale !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
          <div
            className="h-full rounded-full bg-gradient-to-r from-auto-accent to-auto-accent-orange transition-[width] duration-700 ease-[var(--ease-premium)]"
            style={{ width: `${(scale / 5) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
