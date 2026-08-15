import Link from 'next/link'
import type { Trailer, TrailerScene, Entity, EntityType } from '@/types'
import { getEntity } from '@/lib/entities'
import { EntityImage } from '@/components/entities/EntityImage'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { ENTITY_TYPE_LABELS, ENTITY_TYPE_GROUP_ORDER } from '@/lib/entity-labels'

interface TrailerScenesProps {
  trailer: Trailer
}

interface ResolvedLink {
  entity: Entity
  relation: string
}

/**
 * Resuelve las `relations` de una escena contra el contenido real,
 * reusando el mismo `EntityRelation` (targetType/targetSlug/relation)
 * que ya conecta al resto de las entidades del sitio. Esto es lo que
 * habilita el vínculo "escena → personaje → ubicación → vehículo →
 * actividad" pedido para el archivo de trailers.
 */
async function resolveSceneLinks(scene: TrailerScene): Promise<ResolvedLink[]> {
  if (!scene.relations || scene.relations.length === 0) return []

  const resolved = await Promise.all(
    scene.relations.map(async (rel) => {
      const entity = await getEntity(rel.targetType, rel.targetSlug)
      return entity ? { entity, relation: rel.relation } : null
    })
  )

  return resolved.filter((r): r is ResolvedLink => r !== null)
}

/** Agrupa los links resueltos de una escena por tipo de entidad, en el orden editorial definido. */
function groupLinksByType(links: ResolvedLink[]): Array<{ type: EntityType; links: ResolvedLink[] }> {
  const byType = new Map<EntityType, ResolvedLink[]>()
  for (const link of links) {
    const type = link.entity.type
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push(link)
  }

  const ordered = ENTITY_TYPE_GROUP_ORDER.filter((t) => byType.has(t)).map((type) => ({
    type,
    links: byType.get(type)!,
  }))

  // Cualquier tipo real presente pero no contemplado en el orden editorial
  // (no debería pasar con los tipos actuales, pero evita perder datos si
  // se agrega un nuevo tipo de entidad con relaciones de escena mañana).
  for (const [type, group] of byType) {
    if (!ordered.some((o) => o.type === type)) ordered.push({ type, links: group })
  }

  return ordered
}

/**
 * Timeline vertical de escenas de un trailer — línea de tiempo conectada con
 * un marcador por escena (como un editor de video/archivo forense), con
 * navegador rápido por timestamp arriba y las entidades relacionadas
 * agrupadas por tipo (personajes, ubicaciones, vehículos...) dentro de cada
 * escena, en vez de una pila plana de avatares mezclados.
 */
export async function TrailerScenes({ trailer }: TrailerScenesProps) {
  const scenesWithLinks = await Promise.all(
    trailer.scenes.map(async (scene) => ({
      scene,
      groups: groupLinksByType(await resolveSceneLinks(scene)),
    }))
  )

  return (
    <div>
      {/* Navegador rápido: salta directo a cualquier escena por su timestamp,
          sin depender de scroll manual — "navegación entre escenas". */}
      <nav
        aria-label="Navegador de escenas"
        className="scene-nav-rail mb-8 flex gap-2 overflow-x-auto pb-2"
      >
        {trailer.scenes.map((scene, i) => (
          <a
            key={scene.id}
            href={`#${scene.id}`}
            className="scene-nav-chip"
            title={scene.title}
          >
            <span className="scene-nav-chip-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="scene-nav-chip-time">{scene.timestamp}</span>
          </a>
        ))}
      </nav>

      <div className="scene-timeline relative">
        <div className="scene-timeline-rail" aria-hidden="true" />
        <ol className="space-y-10">
          {scenesWithLinks.map(({ scene, groups }, i) => (
            <li
              key={scene.id}
              id={scene.id}
              className="scene-timeline-item relative scroll-mt-28 pl-14"
            >
              <div className="scene-timeline-marker" aria-hidden="true">
                <span className="scene-timeline-marker-index">{String(i + 1).padStart(2, '0')}</span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="scene-timestamp font-mono text-xs font-semibold text-gta-dark">
                  {scene.timestamp}
                </span>
                <h3 className="text-base font-semibold text-gta-text">{scene.title}</h3>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gta-text-secondary">
                {scene.description}
              </p>

              {groups.length > 0 && (
                <div className="mt-4 space-y-3">
                  {groups.map(({ type, links }) => (
                    <div key={type} className="flex flex-wrap items-start gap-2">
                      <span
                        className="mt-1 flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gta-text-tertiary"
                        aria-hidden="true"
                      >
                        <CategoryIcon type={type} className="h-3.5 w-3.5" />
                        {ENTITY_TYPE_LABELS[type]}
                      </span>
                      <ul className="flex flex-wrap gap-2">
                        {links.map(({ entity, relation }) => (
                          <li key={`${entity.type}-${entity.slug}`}>
                            <Link
                              href={`/${entity.type}/${entity.slug}`}
                              className="group flex items-center gap-2 rounded-full border border-gta-border bg-gta-card/60 py-1 pl-1 pr-3 transition-colors hover:border-gta-accent/60 hover:bg-gta-darker/60"
                            >
                              <EntityImage entity={entity} variant="avatar" className="h-6 w-6 rounded-full" />
                              <span className="text-xs text-gta-text-secondary transition-colors group-hover:text-gta-text">
                                <span className="text-gta-text-secondary/70">{relation}:</span>{' '}
                                <span className="font-medium text-gta-text">{entity.title}</span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
