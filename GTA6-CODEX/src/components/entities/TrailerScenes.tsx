import Link from 'next/link'
import type { Trailer, TrailerScene, Entity } from '@/types'
import { getEntity } from '@/lib/entities'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

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
 * Timeline de escenas de un trailer. Cada escena muestra su timestamp,
 * una descripción fiel a lo mostrado (sin especular más allá de eso) y,
 * cuando existen, chips hacia las entidades que aparecen en ella.
 */
export async function TrailerScenes({ trailer }: TrailerScenesProps) {
  const scenesWithLinks = await Promise.all(
    trailer.scenes.map(async (scene) => ({
      scene,
      links: await resolveSceneLinks(scene),
    }))
  )

  return (
    <div className="space-y-4">
      {scenesWithLinks.map(({ scene, links }, i) => (
        <Card key={scene.id} className="shadow-gta-sm">
          <CardBody>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-xs text-gta-accent">{scene.timestamp}</span>
              <h3 className="text-base font-semibold text-gta-text">{scene.title}</h3>
              <span className="ml-auto text-[11px] text-gta-text-secondary/60">
                Escena {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gta-text-secondary">
              {scene.description}
            </p>
            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {links.map(({ entity, relation }) => (
                  <Link key={`${entity.type}-${entity.slug}`} href={`/${entity.type}/${entity.slug}`}>
                    <Badge variant="tag" className="transition-colors hover:border-gta-accent/60">
                      {relation}: {entity.title}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
