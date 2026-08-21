import Link from 'next/link'
import type { Trailer, TrailerScene, Entity, EntityType } from '@/types'
import { getEntity } from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import { EntityImage } from '@/components/entities/EntityImage'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { ENTITY_TYPE_LABELS, ENTITY_TYPE_GROUP_ORDER, STATUS_LABELS } from '@/lib/entity-labels'

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
 * Junta las entidades relacionadas de una escena (ya agrupadas por tipo en
 * el mismo orden editorial) en una lista plana y deduplicada, para armar
 * el cluster de avatares que sirve de "poster" de la mini-card — sin
 * inventar ninguna imagen nueva: son las mismas fotos/glifos ya resueltos
 * por `resolveEntityDisplayImage` que también usa RelationsPanel.
 */
function collectPosterEntities(groups: Array<{ type: EntityType; links: ResolvedLink[] }>): Entity[] {
  const seen = new Set<string>()
  const entities: Entity[] = []
  for (const group of groups) {
    for (const { entity } of group.links) {
      const key = `${entity.type}-${entity.slug}`
      if (seen.has(key)) continue
      seen.add(key)
      entities.push(entity)
    }
  }
  return entities
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
        <ol className="space-y-8">
          {scenesWithLinks.map(({ scene, groups }, i) => {
            // Cluster de avatares reales (personajes/vehículos/ubicaciones/
            // etc. que ya aparecen en `groups`) para el "poster" de la
            // mini-card. Si la escena no tiene relaciones, simplemente no
            // hay poster — nunca se inventa una imagen para rellenar.
            const posterEntities = collectPosterEntities(groups)
            const visiblePoster = posterEntities.slice(0, 4)
            const posterOverflow = posterEntities.length - visiblePoster.length

            return (
              <li
                key={scene.id}
                id={scene.id}
                className="scene-timeline-item relative scroll-mt-28 pl-14"
              >
                <div className="scene-timeline-marker" aria-hidden="true">
                  <span className="scene-timeline-marker-index">{String(i + 1).padStart(2, '0')}</span>
                </div>

                {/* Mini-card premium por escena: mismo lenguaje visual que
                    EntityCard/RelationsPanel (border + bg-gta-card, glow de
                    acento en hover, cluster de avatares como "poster" en vez
                    de un video/imagen nueva — sin cargar ningún medio extra,
                    ver punto 14 de la Fase 8 original). Reveal en cascada
                    (delay creciente y acotado) para que la lista larga de
                    escenas del Trailer 2 no aparezca toda de golpe. */}
                <Reveal direction="left" delay={Math.min(i * 40, 320)}>
                  <div className="scene-card group/scene overflow-hidden rounded-xl border border-gta-border bg-gta-card transition-colors duration-300 hover:border-gta-accent/45 hover:bg-gta-surface-elevated">
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
                      {visiblePoster.length > 0 && (
                        <div
                          className="flex shrink-0 items-center self-start"
                          aria-hidden="true"
                        >
                          {visiblePoster.map((entity, idx) => (
                            <Link
                              key={`${entity.type}-${entity.slug}`}
                              href={`/${entity.type}/${entity.slug}`}
                              tabIndex={-1}
                              className="group relative -ml-3 block rounded-full ring-2 ring-gta-card transition-transform duration-300 first:ml-0 hover:z-10 hover:-translate-y-0.5"
                              style={{ zIndex: visiblePoster.length - idx }}
                            >
                              <EntityImage
                                entity={entity}
                                image={resolveEntityDisplayImage(entity)}
                                variant="avatar"
                                className="h-11 w-11 rounded-full sm:h-12 sm:w-12"
                              />
                            </Link>
                          ))}
                          {posterOverflow > 0 && (
                            <span className="relative -ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gta-border bg-gta-darker text-[11px] font-semibold text-gta-text-secondary ring-2 ring-gta-card sm:h-12 sm:w-12">
                              +{posterOverflow}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="scene-timestamp font-mono text-xs font-semibold text-gta-dark">
                            {scene.timestamp}
                          </span>
                          {scene.status && (
                            <Badge variant="status" status={scene.status}>
                              {STATUS_LABELS[scene.status] || scene.status}
                            </Badge>
                          )}
                        </div>

                        <h3 className="mt-1.5 text-base font-semibold text-gta-text">{scene.title}</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gta-text-secondary">
                          {scene.description}
                        </p>

                        {groups.length > 0 && (
                          <div className="mt-4 space-y-3 border-t border-gta-border pt-4">
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
                                        className="group flex items-center gap-2 rounded-full border border-gta-border bg-gta-darker/50 py-1 pl-1 pr-3 transition-colors hover:border-gta-accent/60 hover:bg-gta-darker/80"
                                      >
                                        <EntityImage
                                          entity={entity}
                                          image={resolveEntityDisplayImage(entity)}
                                          variant="avatar"
                                          className="h-6 w-6 rounded-full"
                                        />
                                        <span className="text-xs text-gta-text-secondary transition-colors group-hover:text-gta-text">
                                          <span className="text-gta-text-secondary/80">{relation}:</span>{' '}
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
                      </div>
                    </div>
                  </div>
                </Reveal>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
