import Link from 'next/link'
import { Entity, EntityType } from '@/types'
import { getRelationLabel } from '@/lib/relations'
import { Badge } from '@/components/ui/Badge'
import { EntityImage } from '@/components/entities/EntityImage'
import { resolveEntityDisplayImage } from '@/lib/media'
import { CategoryIcon } from '@/components/ui/CategoryIcon'

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
}

interface RelationsPanelProps {
  related: Array<{ entity: Entity; relation: string }>
}

/**
 * Agrupa las entidades relacionadas por tipo de vínculo (ej. "Ubicado en",
 * "Conduce", "Trabaja para") en lugar de una lista plana, para que la
 * naturaleza de cada relación sea explícita. Cada fila muestra un avatar
 * (imagen real o glifo de categoría) para que el panel se sienta como un
 * índice de base de datos navegable, no una lista de texto.
 */
export function RelationsPanel({ related }: RelationsPanelProps) {
  if (related.length === 0) return null

  const groups = new Map<string, Entity[]>()
  for (const { entity, relation } of related) {
    const label = getRelationLabel(relation)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entity)
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
            {entities.map((e) => (
              <li key={`${e.type}-${e.slug}`}>
                <Link
                  href={`/${e.type}/${e.slug}`}
                  className="group -mx-2 flex items-center gap-3 rounded-md border border-dashed border-transparent px-2 py-2 transition-colors duration-200 hover:border-auto-border-strong hover:bg-auto-darker/40"
                >
                  <EntityImage
                    entity={e}
                    image={resolveEntityDisplayImage(e)}
                    variant="avatar"
                    className="h-11 w-11 shrink-0 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="link-underline truncate text-sm text-auto-text group-hover:text-auto-accent">
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
                    className="ml-auto shrink-0 text-auto-text-secondary/40 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-auto-accent group-hover:opacity-100"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
