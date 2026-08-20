import { ReactNode } from 'react'
import { Entity, EntityType } from '@/types'
import { collectGenericFields } from '@/lib/entity-fields'
import { Card, CardBody } from '@/components/ui/Card'
import { EntitySectionHeading } from '@/components/entities/EntitySectionHeading'
import { StatBar } from '@/components/entities/StatBar'

/** Mismo par label/valor que las quick-facts de `EntityCard` (mono,
 *  uppercase tracking-wide para el label; mono tabular-nums para el
 *  valor) — la "Ficha técnica" de la ficha completa es, literalmente,
 *  la versión extendida de esas mismas quick-facts, así que ahora se
 *  ven como la misma pieza tipográfica en vez de dos sistemas distintos
 *  (Fase "Expediente", punto 2). */
function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-mono text-[10px] uppercase tracking-wide text-gta-text-tertiary">{label}</dt>
      <dd className="truncate text-right font-mono text-xs font-medium tabular-nums text-gta-text">{value}</dd>
    </div>
  )
}

function ListField({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <dt className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-gta-text-tertiary">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md border border-dashed border-gta-border-strong bg-gta-darker px-2 py-0.5 font-mono text-xs text-gta-text"
          >
            {item}
          </span>
        ))}
      </dd>
    </div>
  )
}

/**
 * Ficha técnica genérica y data-driven: se activa para cualquier tipo de
 * entidad sin rama dedicada arriba (hoy, los 7 `GenericEntity`: armas,
 * actividades, organizaciones, negocios, objetos, noticias, guias).
 * Reutiliza exactamente los mismos helpers (`Field`, `ListField`,
 * `withCard`) que ya usan las ramas específicas, solo que alimentados por
 * datos en vez de por una rama de código por tipo.
 */
function GenericEntityMetadata({ entity }: { entity: Record<string, unknown> }) {
  const fields = collectGenericFields(entity)
  if (fields.length === 0) return null

  const textFields = fields.filter((f) => f.kind === 'text')
  const listFields = fields.filter((f) => f.kind === 'list')

  return withCard(
    <div className="space-y-3">
      {textFields.length > 0 && (
        <dl className="space-y-2 border-y border-dashed border-gta-border-strong py-2.5">
          {textFields.map((field) => (
            <Field key={field.label} label={field.label} value={field.value as string} />
          ))}
        </dl>
      )}
      {listFields.map((field) => (
        <ListField key={field.label} label={field.label} items={field.value as string[]} />
      ))}
    </div>
  )
}

interface EntityMetadataProps {
  entity: Entity
}

/**
 * Renderiza la ficha técnica específica por tipo de entidad,
 * usando exclusivamente campos que ya existen en el contenido
 * (nunca inventa datos ausentes).
 */
function withCard(body: ReactNode | null) {
  if (!body) return null
  return (
    <Card className="shadow-gta-sm">
      <CardBody>
        <EntitySectionHeading label="Ficha técnica" />
        {body}
      </CardBody>
    </Card>
  )
}

export function EntityMetadata({ entity }: EntityMetadataProps) {
  if (entity.type === EntityType.VEHICLE) {
    const hasPerformance =
      entity.performance &&
      Object.values(entity.performance).some((v) => v && v !== 'N/A')
    const hasBasics = entity.manufacturer || entity.class
    if (!hasPerformance && !hasBasics && !entity.driven_by?.length) return null

    return withCard(
      <div className="space-y-4">
        {hasBasics && (
          <dl className="space-y-2 border-y border-dashed border-gta-border-strong py-2.5">
            <Field label="Fabricante" value={entity.manufacturer} />
            <Field label="Clase" value={entity.class} />
            <Field label="Personalizable" value={entity.customizable ? 'Sí' : undefined} />
          </dl>
        )}
        {hasPerformance && (
          <div className="space-y-3 border-t border-dashed border-gta-border-strong pt-3">
            <StatBar label="Velocidad" value={entity.performance?.speed} />
            <StatBar label="Aceleración" value={entity.performance?.acceleration} />
            <StatBar label="Manejo" value={entity.performance?.handling} />
            <StatBar label="Frenado" value={entity.performance?.braking} />
          </div>
        )}
        <ListField label="Conducido por" items={entity.driven_by} />
      </div>
    )
  }

  if (entity.type === EntityType.CHARACTER) {
    const hasAlias = entity.alias && entity.alias.length > 0
    const hasAppearance = entity.appearance && Object.values(entity.appearance).some(Boolean)
    if (!hasAlias && !entity.faction && !entity.voice_actor && !hasAppearance) return null

    return withCard(
      <div className="space-y-3">
        <dl className="space-y-2 border-y border-dashed border-gta-border-strong py-2.5">
          <Field label="Facción" value={entity.faction} />
          <Field label="Actor de voz" value={entity.voice_actor} />
        </dl>
        <ListField label="Alias" items={entity.alias} />
        {hasAppearance && (
          <dl className="space-y-2 border-t border-dashed border-gta-border-strong pt-3">
            <Field label="Edad" value={entity.appearance?.age} />
            <Field label="Altura" value={entity.appearance?.height} />
            <Field label="Contextura" value={entity.appearance?.build} />
            <Field label="Rasgos" value={entity.appearance?.characteristics} />
          </dl>
        )}
      </div>
    )
  }

  if (entity.type === EntityType.LOCATION) {
    const loc = entity as Extract<Entity, { type: EntityType.LOCATION }>
    const hasEnvironment =
      loc.environment &&
      (loc.environment.climate ||
        loc.environment.fauna?.length ||
        loc.environment.naturalEvents?.length ||
        loc.environment.unconfirmedNote)
    if (
      !loc.district &&
      !loc.region &&
      !loc.points_of_interest?.length &&
      !loc.businesses?.length &&
      !hasEnvironment
    )
      return null

    return withCard(
      <div className="space-y-3">
        <dl className="space-y-2 border-y border-dashed border-gta-border-strong py-2.5">
          <Field label="Distrito" value={loc.district} />
          <Field label="Región" value={loc.region} />
        </dl>
        <ListField label="Puntos de interés" items={loc.points_of_interest} />
        <ListField label="Negocios" items={loc.businesses} />
        {hasEnvironment && (
          <div className="space-y-2 border-t border-dashed border-gta-border-strong pt-3">
            <Field label="Clima" value={loc.environment?.climate} />
            <ListField label="Fauna confirmada" items={loc.environment?.fauna} />
            <ListField label="Eventos ambientales confirmados" items={loc.environment?.naturalEvents} />
            {loc.environment?.unconfirmedNote && (
              <p className="text-xs italic leading-relaxed text-gta-text-secondary/80">
                {loc.environment.unconfirmedNote}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (entity.type === EntityType.MISSION) {
    const mission = entity as Extract<Entity, { type: EntityType.MISSION }>
    if (
      !mission.giver &&
      !mission.reward &&
      !mission.mission_type &&
      !mission.objectives?.length
    )
      return null

    return withCard(
      <div className="space-y-3">
        <dl className="space-y-2 border-y border-dashed border-gta-border-strong py-2.5">
          <Field label="Encargado por" value={mission.giver} />
          <Field label="Tipo" value={mission.mission_type} />
          <Field label="Recompensa" value={mission.reward} />
        </dl>
        <ListField label="Objetivos" items={mission.objectives} />
        <ListField label="Personajes involucrados" items={mission.characters_involved} />
      </div>
    )
  }

  // Trailer ya tiene componentes dedicados (TrailerStats, TrailerScenes)
  // que muestran su estructura propia en otra parte de la ficha; una
  // ficha técnica genérica acá sería redundante/ruido visual.
  if (entity.type === EntityType.TRAILER) return null

  // Cualquier otro tipo (hoy, los 7 GenericEntity) usa el renderizador
  // genérico: no requiere una rama nueva acá para mostrar sus campos.
  return <GenericEntityMetadata entity={entity as unknown as Record<string, unknown>} />
}
