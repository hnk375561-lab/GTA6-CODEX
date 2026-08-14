import Link from 'next/link'
import { Entity, EntityType } from '@/types'
import { getRelationLabel } from '@/lib/relations'

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
                  className="group flex flex-col text-sm transition-colors"
                >
                  <span className="link-underline text-gta-text group-hover:text-gta-accent">
                    {e.title}
                  </span>
                  <span className="text-xs text-gta-text-secondary">{TYPE_LABELS[e.type]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
