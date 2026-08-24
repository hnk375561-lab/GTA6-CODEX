import Link from 'next/link'
import { EntityType } from '@/types'
import { getAllEntities, getEntityPath } from '@/lib/entities'

/**
 * Franja de tendencias, justo debajo del header — mismo lugar y función
 * que el "trending: X · Y · Z" del mockup original, pero alimentada por
 * datos reales (`getFeaturedEntities`) en vez de texto hardcodeado.
 *
 * Se restringe a tipos "con gancho" (vehículos) a propósito: la home ya
 * tiene una sección "Destacados" más abajo que usa el mismo
 * `getFeaturedEntities`, así que traer los mismos 6 resultados acá los
 * duplicaría arriba y abajo de la misma página. Filtrando por tipo se
 * obtiene una selección distinta y además más parecida al tono de un
 * ticker de "trending" (fichas concretas, no guías o noticias).
 *
 * Server component puro: no necesita estado ni interactividad, así que
 * no suma JS al bundle del cliente. Se corta a `LIMIT` entradas y se
 * vuelve scrolleable en horizontal en mobile en vez de wrapear, para no
 * empujar el contenido hacia abajo en pantallas chicas.
 */
const LIMIT = 6
const TRENDING_TYPES = new Set<EntityType>([EntityType.VEHICLE])

export async function TrendingBar() {
  // Se filtra por tipo ANTES de cortar a LIMIT (no al revés): guías,
  // noticias y misiones son casi siempre lo más "reciente" del archivo
  // (fechas de lanzamiento, actualizaciones editoriales), así que un
  // top-N genérico por fecha las gana casi todas y deja afuera a los
  // personajes/vehículos/ubicaciones que sí queremos acá. Se recorre
  // todo el universo una vez — barato, `getAllEntities` ya está cacheado
  // en memoria por request.
  const all = await getAllEntities()
  const trending = all
    .filter((e) => e.featured && TRENDING_TYPES.has(e.type))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, LIMIT)
  if (trending.length === 0) return null

  return (
    <div className="glass-surface border-b border-auto-border/60">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <span className="eyebrow shrink-0 text-[11px] font-semibold uppercase tracking-[0.25em] text-auto-accent">
          Tendencia
        </span>
        <ul className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm">
          {trending.map((entity, i) => (
            <li key={`${entity.type}-${entity.slug}`} className="flex items-center gap-3">
              {i > 0 && <span className="text-auto-text-tertiary/60" aria-hidden="true">·</span>}
              <Link
                href={getEntityPath(entity.type, entity.slug)}
                className="link-underline font-medium text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
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
