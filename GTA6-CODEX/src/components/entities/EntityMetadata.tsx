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
      <dt className="font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">{label}</dt>
      <dd className="truncate text-right font-mono text-xs font-medium tabular-nums text-auto-text">{value}</dd>
    </div>
  )
}

function ListField({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <dt className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md border border-dashed border-auto-border-strong bg-auto-darker px-2 py-0.5 font-mono text-xs text-auto-text"
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
        <dl className="space-y-2 border-y border-dashed border-auto-border-strong py-2.5">
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
    <Card className="shadow-auto-sm">
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
          <dl className="space-y-2 border-y border-dashed border-auto-border-strong py-2.5">
            <Field label="Fabricante" value={entity.manufacturer} />
            <Field label="Clase" value={entity.class} />
            <Field label="Personalizable" value={entity.customizable ? 'Sí' : undefined} />
          </dl>
        )}
        {hasPerformance && (
          <div className="space-y-3 border-t border-dashed border-auto-border-strong pt-3">
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

  // Cualquier otro tipo (hoy, NEWS/GUIDE) usa el renderizador genérico: no
  // requiere una rama nueva acá para mostrar sus campos.
  return <GenericEntityMetadata entity={entity as unknown as Record<string, unknown>} />
}
