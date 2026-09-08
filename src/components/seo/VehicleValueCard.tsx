'use client'

interface VehicleValueCardImage {
  src?: string
}

interface VehicleValueCardProps {
  vehicle: {
    slug: string
    title: string
    manufacturer?: string
    class?: string
    power?: string
    price?: string
    type: string
  }
  image: VehicleValueCardImage | null | undefined
  score: number
  tier: string
}

function getTierColor(tier: string) {
  switch (tier) {
    case 'excelente': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'buena': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'regular': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400'
  }
}

function getTierLabel(tier: string) {
  switch (tier) {
    case 'excelente': return 'Mejor compra'
    case 'buena': return 'Buena opción'
    case 'regular': return 'Opción válida'
    default: return 'Básica'
  }
}

export function VehicleValueCard({ vehicle, image, tier }: VehicleValueCardProps) {
  return (
    <a
      href={`/vehiculos/${vehicle.slug}`}
      className="group block h-full"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-alt">
        {image?.src && (
          <img
            src={image.src}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-auto-accent/15 text-auto-accent-strong border border-auto-accent/30 text-xs">
              {vehicle.manufacturer}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getTierColor(tier)}`}>
              {getTierLabel(tier)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="font-display text-lg font-bold text-neutral-900 group-hover:text-auto-accent transition-colors line-clamp-1">
          {vehicle.title}
        </h3>
        <p className="text-sm text-neutral-500 font-medium">
          {vehicle.manufacturer} · {vehicle.class}
        </p>
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-neutral-900">
            {vehicle.power || '—'}
          </span>
          <span className="font-mono text-auto-accent-strong">
            Score: {Math.round(1000 * (parseInt(vehicle.power?.replace(/\D/g, '') || '0') / Math.max(parseInt(vehicle.price?.replace(/[^\d]/g, '') || '1'), 1)))}
          </span>
        </div>
      </div>
    </a>
  )
}