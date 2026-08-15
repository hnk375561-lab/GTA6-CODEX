import Link from 'next/link'
import type { Trailer, TrailerScene, Entity } from '@/types'
import { getEntity } from '@/lib/entities'
import { EntityImage } from '@/components/entities/EntityImage'

interface TrailerScenesProps {
  trailer: Trailer
}

/**
 * Resuelve las `relations` de una escena contra el contenido real,
 * reusando el mismo `EntityRelation` (targetType/targetSlug/relation)
 * que ya conecta al resto de las entidades del sitio. Esto es lo que
 * habilita el vínculo "escena → personaje → ubicación → vehículo →
 * actividad" pedido para el archivo de trailers.
 */
async function resolveSceneLinks(
  scene: TrailerScene
): Promise<Array<{ entity: Entity; relation: string }>> {
  if (!scene.relations || scene.relations.length === 0) return []

  const resolved = await Promise.all(
    scene.relations.map(async (rel) => {
      const entity = await getEntity(rel.targetType, rel.targetSlug)
      return entity ? { entity, relation: rel.relation } : null
    })
  )

  return resolved.filter((r): r is { entity: Entity; relation: string } => r !== null)
}

/**
 * Timeline vertical de escenas de un trailer — línea de tiempo conectada con
 * un marcador por escena (como un editor de video/archivo forense), no una
 * pila de cards sueltas. Cada escena muestra su timestamp, una descripción
 * fiel a lo mostrado (sin especular más allá de eso) y, cuando existen,
 * avatares de las entidades que aparecen en ella.
 */
export async function TrailerScenes({ trailer }: TrailerScenesProps) {
  const scenesWithLinks = await Promise.all(
    trailer.scenes.map(async (scene) => ({
      scene,
      links: await resolveSceneLinks(scene),
    }))
  )

  return (
    <div className="scene-timeline relative">
      <div className="scene-timeline-rail" aria-hidden="true" />
      <ol className="space-y-8">
        {scenesWithLinks.map(({ scene, links }, i) => (
          <li key={scene.id} className="scene-timeline-item relative pl-14">
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
            {links.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
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
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
