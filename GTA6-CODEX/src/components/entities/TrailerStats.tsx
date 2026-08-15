import type { Trailer } from '@/types'
import { EntityType } from '@/types'

interface TrailerStatsProps {
  trailer: Trailer
}

function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Barra de métricas derivadas 100% de datos reales del propio trailer
 * (escenas, relaciones, releaseDate, durationSeconds) — nunca inventa
 * un número que no pueda calcularse de `trailer.scenes`.
 */
export function TrailerStats({ trailer }: TrailerStatsProps) {
  const distinctBySlug = (type: EntityType) => {
    const set = new Set<string>()
    for (const scene of trailer.scenes) {
      for (const rel of scene.relations || []) {
        if (rel.targetType === type) set.add(rel.targetSlug)
      }
    }
    return set.size
  }

  const characterCount = distinctBySlug(EntityType.CHARACTER)
  const locationCount = distinctBySlug(EntityType.LOCATION)
  const vehicleCount = distinctBySlug(EntityType.VEHICLE)
  const duration = formatDuration(trailer.durationSeconds)

  const stats: Array<{ label: string; value: string }> = [
    { label: 'Escenas', value: String(trailer.scenes.length) },
  ]
  if (characterCount > 0) stats.push({ label: 'Personajes', value: String(characterCount) })
  if (locationCount > 0) stats.push({ label: 'Ubicaciones', value: String(locationCount) })
  if (vehicleCount > 0) stats.push({ label: 'Vehículos', value: String(vehicleCount) })
  if (duration) stats.push({ label: 'Duración', value: duration })
  stats.push({
    label: 'Publicado',
    value: new Date(trailer.releaseDate).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  })

  return (
    <dl className="trailer-stats-bar grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gta-border bg-gta-border sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-gta-card/90 px-4 py-3.5">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gta-text-tertiary">
            {stat.label}
          </dt>
          <dd className="mt-0.5 font-display text-lg font-bold text-gta-text">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
