import Link from 'next/link'
import { Entity, EntityType } from '@/types'
import { getRelationLabel } from '@/lib/relations'
import { Badge } from '@/components/ui/Badge'

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.CHARACTER]: 'Personajes',
  [EntityType.VEHICLE]: 'Vehículos',
  [EntityType.LOCATION]: 'Ubicaciones',
  [EntityType.MISSION]: 'Misiones',
  [EntityType.WEAPON]: 'Armas',
  [EntityType.ACTIVITY]: 'Actividades',
  [EntityType.FACTION]: 'Organizaciones',
  [EntityType.BUSINESS]: 'Negocios',
  [EntityType.OBJECT]: 'Objetos',
  [EntityType.NEWS]: 'Noticias',
  [EntityType.GUIDE]: 'Guías',
}

interface RelationsPanelProps {
  related: Array<{ entity: Entity; relation: string }>
}

/**
 * Agrupa las entidades relacionadas por tipo de vínculo (ej. "Ubicado en",
 * "Conduce", "Trabaja para") en lugar de una lista plana, para que la
 * naturaleza de cada relación sea explícita.
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
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([label, entities]) => (
        <div key={label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gta-accent">
            {label}
          </h3>
          <ul className="space-y-2.5">
            {entities.map((e) => (
              <li key={`${e.type}-${e.slug}`}>
                <Link
                  href={`/${e.type}/${e.slug}`}
                  className="group -mx-2 flex flex-col gap-1 rounded-md border border-transparent px-2 py-1.5 transition-colors duration-200 hover:border-gta-border hover:bg-gta-darker/40"
                >
                  <span className="link-underline text-sm text-gta-text group-hover:text-gta-accent">
                    {e.title}
                  </span>
                  <Badge className="w-fit">{TYPE_LABELS[e.type]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
