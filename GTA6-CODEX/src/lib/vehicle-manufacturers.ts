import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'

/**
 * Slugify determinístico para nombres de fabricante ("Western Company" ->
 * "western-company"). Usado tanto por la página hub
 * (`/vehiculos/fabricante/[manufacturer]`) como por `sitemap.ts`, para
 * que ambos generen exactamente las mismas URLs sin duplicar la lógica.
 */
export function slugifyManufacturer(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface ManufacturerGroup {
  slug: string
  label: string
  vehicles: Vehicle[]
}

/**
 * Agrupa todos los vehículos por fabricante (campo `manufacturer`,
 * opcional en el schema). Vehículos sin fabricante documentado quedan
 * fuera de todos los grupos — no se agrega un cajón "sin fabricante"
 * porque no aporta valor de navegación ni de SEO.
 */
export async function getVehiclesByManufacturer(): Promise<Map<string, ManufacturerGroup>> {
  const entities = await getEntitiesByType(EntityType.VEHICLE)
  const map = new Map<string, ManufacturerGroup>()

  for (const entity of entities) {
    const vehicle = entity as Vehicle
    const manufacturer = vehicle.manufacturer
    if (!manufacturer) continue
    const slug = slugifyManufacturer(manufacturer)
    const existing = map.get(slug)
    if (existing) {
      existing.vehicles.push(vehicle)
    } else {
      map.set(slug, { slug, label: manufacturer, vehicles: [vehicle] })
    }
  }

  return map
}
