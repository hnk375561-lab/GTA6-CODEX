import Link from 'next/link'
import { EntityType } from '@/types'
import { getAllEntities, getEntityPath } from '@/lib/entities'

/**
 * Franja de tendencias del archivo — mismo lugar y función que antes,
 * pero con nueva identidad visual de archivo/documento
 */
const LIMIT = 6
const TRENDING_TYPES = new Set<EntityType>([EntityType.VEHICLE])

export async function TrendingBar() {
  const all = await getAllEntities()
  const trending = all
    .filter((e) => e.featured && TRENDING_TYPES.has(e.type))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, LIMIT)
  if (trending.length === 0) return null

  return (
    <div className="border-b border-border bg-paper/50">
      <div className="mx-auto flex max-w-[96rem] items-center gap-3 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8 xl:px-12">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50 shrink-0">
          En consulta
        </span>
        <ul className="flex shrink-0 items-center gap-3 whitespace-nowrap font-mono text-xs">
          {trending.map((entity, i) => (
            <li key={`${entity.type}-${entity.slug}`} className="flex items-center gap-3">
              {i > 0 && <span className="text-ink/20" aria-hidden="true">·</span>}
              <Link
                href={getEntityPath(entity.type, entity.slug)}
                prefetch={false}
                className="text-ink/60 hover:text-oxide-red transition-colors"
              >
                {entity.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
