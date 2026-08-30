import { ReactNode } from 'react'
import { Entity, EntityType, SpecBlock, Vehicle } from '@/types'
import { collectGenericFields, humanizeKey } from '@/lib/entity-fields'
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

/** Sub-encabezado interno de una sección dentro de la ficha técnica (ej.
 *  "Especificaciones de motor", "Seguridad"), para separar visualmente
 *  bloques de datos dentro de la misma Card sin abrir una Card por bloque.
 *  Mismo lenguaje tipográfico que los grupos de `RelationsPanel`. */
function SubHeading({ label }: { label: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-auto-accent">
      <span className="h-1 w-1 rounded-full bg-auto-accent" aria-hidden="true" />
      {label}
    </h3>
  )
}

/** Renderiza un `SpecBlock` (diccionario clave→valor libre, ej.
 *  `especificacionesMotor`) como una lista de `Field`, humanizando cada
 *  clave. No inventa estructura: si el bloque no tiene entradas con valor,
 *  no renderiza nada. */
function SpecBlockFields({ block }: { block?: SpecBlock }) {
  if (!block) return null
  const entries = Object.entries(block).filter(
    ([, value]) => value !== null && value !== undefined && String(value).trim().length > 0
  )
  if (entries.length === 0) return null
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <Field key={key} label={humanizeKey(key)} value={String(value)} />
      ))}
    </dl>
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

/**
 * Ficha técnica de un vehículo, data-driven contra los campos reales del
 * contenido (ver auditoría "AutoFicha: aprovechamiento de datos" y
 * `Vehicle` en `@/types/entity.ts`). Reemplaza la versión anterior, que
 * solo mostraba fabricante/clase/personalizable + 2 de 4 métricas de
 * `performance`: ese renglón ("Personalizable") era un booleano fijo en
 * `false` en las 250 fichas (sin ninguna variación) y `driven_by` estaba
 * 0/250 poblado — ambos, resabios del pivote GTA6→AutoFicha sin valor real
 * para un catálogo de autos. Se retiran acá (oportunidad P0 #6 de la
 * auditoría) en favor de las secciones que sí tienen dato real.
 *
 * Cada sección es condicional de forma independiente: una ficha con
 * cobertura parcial (ej. sin `safety`, poblado solo en 155/250) simplemente
 * no la muestra, en vez de mostrar "Sin dato" en cascada.
 */
function VehicleMetadata({ entity }: { entity: Vehicle }) {
  const hasPerformance =
    entity.performance && Object.values(entity.performance).some((v) => v && v !== 'N/A')
  const hasBasics = entity.manufacturer || entity.class || entity.generacion
  const hasEngine =
    entity.power || entity.potenciaKW || entity.cilindrada || entity.tipoMotor || entity.transmision || entity.traccion
  const hasDimensions =
    entity.dimensiones || entity.peso || entity.asientos || entity.baul || entity.capacidadTanque || entity.neumaticos
  const hasConsumption = entity.consumo || entity.consumoEtiqueta || entity.tiempoRecorrido
  const hasSpecs =
    entity.especificacionesMotor ||
    entity.especificacionesTransmision ||
    entity.especificacionesSuspension ||
    entity.especificacionesRuedas ||
    entity.especificacionesDireccion
  const hasEquipment = entity.equipamiento && entity.equipamiento.length > 0
  const hasSafety = entity.safety && (entity.safety.euroNCAP || entity.safety.puntaje !== undefined)
  const hasAvailability =
    entity.availability &&
    Object.values(entity.availability).some((region) => region?.disponible || region?.precioBase)

  const hasAnyData =
    hasBasics ||
    hasEngine ||
    hasDimensions ||
    hasConsumption ||
    hasPerformance ||
    hasSpecs ||
    hasEquipment ||
    hasSafety ||
    hasAvailability ||
    entity.price

  if (!hasAnyData) return null

  return withCard(
    <div className="space-y-4">
      {hasBasics && (
        <dl className="space-y-2 border-y border-dashed border-auto-border-strong py-2.5">
          <Field label="Fabricante" value={entity.manufacturer} />
          <Field label="Clase" value={entity.class} />
          <Field label="Generación" value={entity.generacion} />
          <Field label="Año de lanzamiento" value={entity.anoLanzamiento ? String(entity.anoLanzamiento) : undefined} />
          <Field label="Producción" value={entity.anoProduccion} />
          <Field label="Precio" value={entity.price} />
        </dl>
      )}

      {hasEngine && (
        <dl className="space-y-2 border-t border-dashed border-auto-border-strong pt-3">
          <Field label="Potencia" value={entity.power} />
          <Field label="Cilindrada" value={entity.cilindrada} />
          <Field label="Tipo de motor" value={entity.tipoMotor} />
          <Field label="Transmisión" value={entity.transmision} />
          <Field label="Tracción" value={entity.traccion} />
        </dl>
      )}

      {(hasPerformance || hasConsumption) && (
        <div className="space-y-3 border-t border-dashed border-auto-border-strong pt-3">
          <StatBar label="Velocidad" value={entity.performance?.speed} />
          <StatBar label="Aceleración" value={entity.performance?.acceleration} />
          <StatBar label="Manejo" value={entity.performance?.handling} />
          <StatBar label="Frenado" value={entity.performance?.braking} />
          {hasConsumption && (
            <dl className="space-y-2 pt-1">
              <Field label="Consumo" value={entity.consumo} />
              <Field label="Etiqueta de consumo" value={entity.consumoEtiqueta} />
              <Field label="0-100 km/h" value={entity.tiempoRecorrido} />
            </dl>
          )}
        </div>
      )}

      {hasDimensions && (
        <dl className="space-y-2 border-t border-dashed border-auto-border-strong pt-3">
          <Field label="Dimensiones" value={entity.dimensiones} />
          <Field label="Peso" value={entity.peso} />
          <Field label="Asientos" value={entity.asientos ? String(entity.asientos) : undefined} />
          <Field label="Baúl" value={entity.baul ? `${entity.baul} L` : undefined} />
          <Field label="Tanque" value={entity.capacidadTanque} />
          <Field label="Neumáticos" value={entity.neumaticos} />
        </dl>
      )}

      {hasEquipment && (
        <div className="border-t border-dashed border-auto-border-strong pt-3">
          <ListField label="Equipamiento" items={entity.equipamiento} />
        </div>
      )}

      {hasSafety && (
        <div className="border-t border-dashed border-auto-border-strong pt-3">
          <SubHeading label="Seguridad" />
          <dl className="space-y-2">
            <Field label="EuroNCAP" value={entity.safety?.euroNCAP} />
            <Field
              label="Puntaje"
              value={entity.safety?.puntaje !== undefined ? `${entity.safety.puntaje}/100` : undefined}
            />
          </dl>
        </div>
      )}

      {hasAvailability && (
        <div className="space-y-3 border-t border-dashed border-auto-border-strong pt-3">
          <SubHeading label="Disponibilidad por mercado" />
          {(
            [
              ['europa', 'Europa'],
              ['americas', 'Américas'],
              ['asia', 'Asia'],
            ] as const
          ).map(([key, label]) => {
            const region = entity.availability?.[key]
            if (!region || (!region.disponible && !region.precioBase)) return null
            return (
              <dl key={key} className="space-y-1.5 rounded-md border border-dashed border-auto-border-strong p-2.5">
                <Field label={label} value={region.precioBase ?? (region.disponible ? 'Disponible' : undefined)} />
                {region.mercados && region.mercados.length > 0 && (
                  <ListField label="Mercados" items={region.mercados} />
                )}
              </dl>
            )
          })}
        </div>
      )}

      {hasSpecs && (
        <div className="space-y-3 border-t border-dashed border-auto-border-strong pt-3">
          <SubHeading label="Especificaciones técnicas" />
          {entity.especificacionesMotor && (
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">Motor</p>
              <SpecBlockFields block={entity.especificacionesMotor} />
            </div>
          )}
          {entity.especificacionesTransmision && (
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">Transmisión</p>
              <SpecBlockFields block={entity.especificacionesTransmision} />
            </div>
          )}
          {entity.especificacionesSuspension && (
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">Suspensión</p>
              <SpecBlockFields block={entity.especificacionesSuspension} />
            </div>
          )}
          {entity.especificacionesRuedas && (
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">Ruedas</p>
              <SpecBlockFields block={entity.especificacionesRuedas} />
            </div>
          )}
          {entity.especificacionesDireccion && (
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-auto-text-tertiary">Dirección</p>
              <SpecBlockFields block={entity.especificacionesDireccion} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EntityMetadata({ entity }: EntityMetadataProps) {
  if (entity.type === EntityType.VEHICLE) {
    return <VehicleMetadata entity={entity} />
  }

  // Cualquier otro tipo (hoy, NEWS/GUIDE) usa el renderizador genérico: no
  // requiere una rama nueva acá para mostrar sus campos.
  return <GenericEntityMetadata entity={entity as unknown as Record<string, unknown>} />
}
