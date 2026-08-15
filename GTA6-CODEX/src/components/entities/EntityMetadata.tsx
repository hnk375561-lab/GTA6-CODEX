import { ReactNode } from 'react'
import { Entity, EntityType } from '@/types'
import { BaseEntitySchema } from '@/types/schemas'
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

/**
 * Claves reservadas del contrato base de toda entidad (ver `BaseEntitySchema`
 * en `src/types/schemas.ts`). Se derivan del schema de Zod ya existente en
 * vez de mantener una lista aparte a mano, para que ambas listas nunca
 * puedan desincronizarse.
 */
const RESERVED_ENTITY_KEYS = new Set<string>(BaseEntitySchema.keyof().options as string[])

/**
 * Convierte una key cruda de JSON (snake_case, la convención ya usada en
 * el contenido existente: `voice_actor`, `mission_type`, `driven_by`...)
 * en un label legible. Heurística de mejor esfuerzo, no traducción: no hay
 * forma de saber de antemano el nombre "editorial" de un campo que todavía
 * no existe, así que esto es lo que un tipo sin ficha técnica dedicada
 * obtiene automáticamente sin tocar código.
 */
function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').trim()
  if (!spaced) return key
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface GenericFieldEntry {
  label: string
  kind: 'text' | 'list'
  value: string | string[]
}

/**
 * Recolecta, de forma genérica, los campos propios (no reservados por
 * BaseEntity) de una entidad: escalares, arrays de string, y un nivel de
 * anidamiento (objetos planos, en el mismo espíritu que `appearance` en
 * Character o `environment` en Location, pero sin necesitar una rama de
 * código dedicada). Es lo que permite que un tipo `GenericEntity` (o
 * cualquier `EntityType` futuro sin rama propia acá abajo) muestre
 * cualquier campo que un editor agregue a su JSON, sin editar este
 * componente.
 */
function collectGenericFields(entity: Record<string, unknown>): GenericFieldEntry[] {
  const entries: GenericFieldEntry[] = []

  for (const [key, value] of Object.entries(entity)) {
    if (RESERVED_ENTITY_KEYS.has(key)) continue
    if (value === null || value === undefined) continue

    if (typeof value === 'string') {
      if (value.trim().length === 0) continue
      entries.push({ label: humanizeKey(key), kind: 'text', value })
      continue
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      entries.push({ label: humanizeKey(key), kind: 'text', value: String(value) })
      continue
    }

    if (Array.isArray(value)) {
      const items = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      if (items.length > 0) entries.push({ label: humanizeKey(key), kind: 'list', value: items })
      continue
    }

    if (isPlainObject(value)) {
      // Un nivel de anidamiento: aplana sub-campos con el mismo criterio.
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue === null || subValue === undefined) continue
        if (typeof subValue === 'string' && subValue.trim().length > 0) {
          entries.push({ label: humanizeKey(subKey), kind: 'text', value: subValue })
        } else if (typeof subValue === 'number' || typeof subValue === 'boolean') {
          entries.push({ label: humanizeKey(subKey), kind: 'text', value: String(subValue) })
        } else if (Array.isArray(subValue)) {
          const items = subValue.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          if (items.length > 0) entries.push({ label: humanizeKey(subKey), kind: 'list', value: items })
        }
      }
    }
  }

  return entries
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
        <dl className="space-y-2">
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

  // Trailer ya tiene componentes dedicados (TrailerStats, TrailerScenes)
  // que muestran su estructura propia en otra parte de la ficha; una
  // ficha técnica genérica acá sería redundante/ruido visual.
  if (entity.type === EntityType.TRAILER) return null

  // Cualquier otro tipo (hoy, los 7 GenericEntity) usa el renderizador
  // genérico: no requiere una rama nueva acá para mostrar sus campos.
  return <GenericEntityMetadata entity={entity as unknown as Record<string, unknown>} />
}
