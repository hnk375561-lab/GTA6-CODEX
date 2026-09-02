import Link from 'next/link'
import { Entity, EntityType } from '@/types'
import { getRelationLabel } from '@/lib/relations'
import { fixedComparisonSlug } from '@/lib/fixed-comparisons'
import { Badge } from '@/components/ui/Badge'
import { EntityImage } from '@/components/entities/EntityImage'
import { resolveEntityDisplayImage } from '@/lib/media'
import { CategoryIcon } from '@/components/ui/CategoryIcon'

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
  [EntityType.MANUFACTURER]: 'Fabricantes',
}

interface RelationsPanelProps {
  related: Array<{ entity: Entity; relation: string }>
  /** Slug de la entidad actual. Junto con `currentType`, habilita el
   *  botón "Comparar" en cada fila relacionada que también sea un
   *  vehículo — construye el link a `/comparar?v=actual,relacionado`
   *  (mismo query param que ya lee `CompareExplorer`). Opcional: si no
   *  se pasa, el panel se comporta exactamente igual que antes (solo
   *  navegación a la ficha). */
  currentSlug?: string
  currentType?: EntityType
}

/**
 * Agrupa las entidades relacionadas por tipo de vínculo (ej. "Ubicado en",
 * "Conduce", "Trabaja para") en lugar de una lista plana, para que la
 * naturaleza de cada relación sea explícita. Cada fila muestra un avatar
 * (imagen real o glifo de categoría) para que el panel se sienta como un
 * índice de base de datos navegable, no una lista de texto.
 */
export function RelationsPanel({ related, currentSlug, currentType }: RelationsPanelProps) {
  if (related.length === 0) return null

  // Comparar solo tiene sentido vehículo-contra-vehículo (`/comparar`
  // opera exclusivamente sobre `Vehicle[]`, ver CompareExplorer). Se
  // arma acá, no en el caller, para no duplicar esta condición en cada
  // página que use RelationsPanel.
  const canOfferCompare = currentType === EntityType.VEHICLE && Boolean(currentSlug)

  const groups = new Map<string, Array<{ entity: Entity; relation: string }>>()
  for (const item of related) {
    const label = getRelationLabel(item.relation)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(item)
  }

  return (
    <div className="space-y-5">
      {Array.from(groups.entries()).map(([label, entities]) => (
        <div key={label}>
          <h3 className="mb-2.5 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-auto-accent">
            <span className="h-1 w-1 rounded-full bg-auto-accent" aria-hidden="true" />
            {label}
          </h3>
          <ul className="space-y-2">
            {entities.map(({ entity: e, relation }) => {
              const showCompare = canOfferCompare && e.type === EntityType.VEHICLE && e.slug !== currentSlug
              // Cuando la relación curada es específicamente "competidor",
              // existe una página SEO fija para el par (oportunidad #11
              // del audit — ver fixed-comparisons.ts) — se linkea ahí en
              // vez de a `/comparar?v=...` para que el click alimente una
              // URL indexable y estable, no solo la comparación efímera
              // por query param. Para cualquier otra relación (ej.
              // "sucesor") no hay página fija: se mantiene el link
              // dinámico de siempre.
              const compareHref =
                relation === 'competidor' && showCompare
                  ? `/comparar/${fixedComparisonSlug(currentSlug!, e.slug)}`
                  : `/comparar?v=${encodeURIComponent(currentSlug ?? '')},${encodeURIComponent(e.slug)}`
              return (
                <li key={`${e.type}-${e.slug}`} className="group/row -mx-2 flex items-center gap-1 rounded-md px-0">
                  <Link
                    href={`/${e.type}/${e.slug}`}
                    className="group flex flex-1 items-center gap-3 rounded-md border border-dashed border-transparent px-2 py-2 transition-colors duration-200 hover:border-edge-strong hover:bg-auto-darker/40"
                  >
                    <EntityImage
                      entity={e}
                      image={resolveEntityDisplayImage(e)}
                      variant="avatar"
                      className="h-11 w-11 shrink-0 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="link-underline truncate text-sm text-neutral-900 group-hover:text-auto-accent">
                        {e.title}
                      </span>
                      {/* font-mono: mismo lenguaje que la pestaña de categoría
                          de EntityCard — este badge es, en los hechos, esa
                          misma etiqueta reaparecida acá. */}
                      <Badge className="w-fit gap-1 font-mono">
                        <CategoryIcon type={e.type} className="h-3 w-3" />
                        {TYPE_LABELS[e.type]}
                      </Badge>
                    </div>
                    <span
                      aria-hidden="true"
                      className="ml-auto shrink-0 text-neutral-500/40 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-auto-accent group-hover:opacity-100"
                    >
                      →
                    </span>
                  </Link>
                  {showCompare && (
                    <Link
                      href={compareHref}
                      className="shrink-0 rounded-md border border-dashed border-edge-strong px-2 py-2 font-mono text-[10px] uppercase tracking-wide text-neutral-500 opacity-0 transition-opacity duration-200 hover:border-auto-accent hover:text-auto-accent group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                      aria-label={`Comparar con ${e.title}`}
                    >
                      Comparar
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
