import { ReactNode } from 'react'
import { Entity, EntityType } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { EntitySectionHeading } from '@/components/entities/EntitySectionHeading'

/** Convierte valores cualitativos ("Media-Alta", "Muy alta"...) a una escala 1-5 para la barra. */
function performanceToScale(value?: string): number | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('n/a')) return null
  if (v.includes('muy alta')) return 5
  if (v.includes('media-alta')) return 3
  if (v.includes('alta')) return 4
  if (v.includes('media')) return 2
  if (v.includes('baja')) return 1
  return null
}

function StatBar({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  const scale = performanceToScale(value)

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-gta-text-secondary">{label}</span>
        <span className="font-medium text-gta-text">{value}</span>
      </div>
      {scale !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gta-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gta-accent to-gta-accent-orange transition-[width] duration-700 ease-[var(--ease-premium)]"
            style={{ width: `${(scale / 5) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-gta-text-secondary">{label}</dt>
      <dd className="text-right text-gta-text">{value}</dd>
    </div>
  )
}

function ListField({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="text-sm">
      <dt className="mb-1 text-gta-text-secondary">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md border border-gta-border bg-gta-card px-2 py-0.5 text-xs text-gta-text"
          >
            {item}
          </span>
        ))}
      </dd>
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
          <dl className="space-y-2">
            <Field label="Fabricante" value={entity.manufacturer} />
            <Field label="Clase" value={entity.class} />
            <Field label="Personalizable" value={entity.customizable ? 'Sí' : undefined} />
          </dl>
        )}
        {hasPerformance && (
          <div className="space-y-3 border-t border-gta-border pt-3">
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
        <dl className="space-y-2">
          <Field label="Facción" value={entity.faction} />
          <Field label="Actor de voz" value={entity.voice_actor} />
        </dl>
        <ListField label="Alias" items={entity.alias} />
        {hasAppearance && (
          <dl className="space-y-2 border-t border-gta-border pt-3">
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
        <dl className="space-y-2">
          <Field label="Distrito" value={loc.district} />
          <Field label="Región" value={loc.region} />
        </dl>
        <ListField label="Puntos de interés" items={loc.points_of_interest} />
        <ListField label="Negocios" items={loc.businesses} />
        {hasEnvironment && (
          <div className="space-y-2 border-t border-gta-border pt-3">
            <Field label="Clima" value={loc.environment?.climate} />
            <ListField label="Fauna confirmada" items={loc.environment?.fauna} />
            <ListField label="Eventos ambientales confirmados" items={loc.environment?.naturalEvents} />
            {loc.environment?.unconfirmedNote && (
              <p className="text-xs italic leading-relaxed text-gta-text-secondary/70">
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
        <dl className="space-y-2">
          <Field label="Encargado por" value={mission.giver} />
          <Field label="Tipo" value={mission.mission_type} />
          <Field label="Recompensa" value={mission.reward} />
        </dl>
        <ListField label="Objetivos" items={mission.objectives} />
        <ListField label="Personajes involucrados" items={mission.characters_involved} />
      </div>
    )
  }

  return null
}
