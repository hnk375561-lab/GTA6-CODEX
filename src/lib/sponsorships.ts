import sponsorshipsRaw from '@/content/monetizacion/patrocinios.json'
import type { Vehicle } from '@/types'

/**
 * Sistema de "ficha destacada" (patrocinio de marca/modelo).
 *
 * Contexto: `/anunciate` y `prospeccion/media-kit-data.json` ya venden este
 * producto ("Ficha destacada (patrocinio de marca/modelo)", ARS
 * 1500-3000/mes) desde antes de que existiera ninguna forma real de
 * entregarlo — si alguien pagaba hoy, activarlo era código a mano por
 * cliente. Este archivo + `SponsoredListingBanner.tsx` cierran esa brecha:
 * activar un patrocinio real pasa a ser sumar un objeto a este JSON (sin
 * tocar componentes ni redeployar código de lógica).
 *
 * `patrocinios.json` empieza vacío a propósito — mismo criterio que
 * `revenue-log.json` y `concesionarias-concepcion-del-uruguay/page.tsx`
 * (LISTINGS = []): no se inventan patrocinadores. Se agrega una entrada
 * recién cuando un negocio real confirma y paga.
 *
 * Alcance (`scope`):
 *  - 'vehiculo': el patrocinio aplica a UN modelo puntual (matchea por
 *    `vehicleSlug` contra `entity.slug`).
 *  - 'fabricante': el patrocinio aplica a TODOS los vehículos de una marca
 *    (matchea por `manufacturerTag`, case-insensitive, contra
 *    `entity.manufacturer`) — para un cliente tipo "concesionaria oficial
 *    de [marca]" que quiere aparecer en todas las fichas de esa marca, no
 *    en un solo modelo.
 *
 * `activo: false` deja la entrada en el archivo (historial de qué se
 * vendió/cuándo) sin que se renderice — para pausar un patrocinio vencido
 * sin borrar el registro.
 */
export interface Sponsorship {
  /** Identificador legible (solo para humanos leyendo el JSON, no se usa en runtime). */
  id: string
  scope: 'vehiculo' | 'fabricante'
  /** Requerido si scope === 'vehiculo'. Debe matchear `entity.slug` exacto. */
  vehicleSlug?: string
  /** Requerido si scope === 'fabricante'. Comparación case-insensitive contra `entity.manufacturer`. */
  manufacturerTag?: string
  sponsorName: string
  /** Texto corto mostrado en el banner, ej. "Consultá disponibilidad y precio en concesionaria oficial". */
  message: string
  /** Número de WhatsApp del patrocinador, solo dígitos con código de país (ej. "5493445XXXXXX"). */
  whatsappNumber?: string
  /** Mensaje prellenado del link de WhatsApp. Si no se pasa, se genera uno genérico con el nombre del vehículo. */
  whatsappMessage?: string
  /** URL externa alternativa (sitio del concesionario) si no hay WhatsApp. */
  externalUrl?: string
  activo: boolean
  /** Fecha ISO opcional, solo referencia humana de vencimiento — no se aplica automáticamente. */
  vigenteHasta?: string
}

function getAllSponsorships(): Sponsorship[] {
  return sponsorshipsRaw as Sponsorship[]
}

/**
 * Devuelve el patrocinio activo para una entidad de vehículo, si existe.
 * Prioridad: match por vehículo específico > match por fabricante — un
 * cliente que paga por un modelo puntual no debería perder su lugar frente
 * a un patrocinio genérico de marca en la misma ficha.
 */
export function getSponsorshipForVehicle(vehicle: Pick<Vehicle, 'slug' | 'manufacturer'>): Sponsorship | null {
  const sponsorships = getAllSponsorships().filter((s) => s.activo)

  const vehicleMatch = sponsorships.find((s) => s.scope === 'vehiculo' && s.vehicleSlug === vehicle.slug)
  if (vehicleMatch) return vehicleMatch

  if (vehicle.manufacturer) {
    const manufacturerMatch = sponsorships.find(
      (s) =>
        s.scope === 'fabricante' &&
        s.manufacturerTag?.toLowerCase() === vehicle.manufacturer?.toLowerCase()
    )
    if (manufacturerMatch) return manufacturerMatch
  }

  return null
}
