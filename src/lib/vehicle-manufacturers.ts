import { EntityType, type Vehicle } from '@/types'
import { getEntitiesByType } from '@/lib/entities'
import { resolveEntityDisplayImage } from '@/lib/media'
import type { ResolvedDisplayImage } from '@/lib/images'

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

/**
 * Ítem plano (serializable) de un fabricante para el marquee de la home
 * (panel 2.5, junto a Categorías). Se define acá y no en el componente
 * cliente porque `resolveEntityDisplayImage` depende de `fs` y solo puede
 * resolverse en servidor — mismo patrón que `heroShowcaseVehicles` en
 * `src/app/page.tsx`.
 */
export interface ManufacturerMarqueeItem {
  slug: string
  label: string
  image: ResolvedDisplayImage | null
}

/**
 * Trae los fabricantes documentados como entidad de primera clase
 * (`EntityType.MANUFACTURER`, 75 en el dataset actual — ver comentario en
 * `Manufacturer` en `src/types/entity.ts`) con su logo ya resuelto, para
 * alimentar el marquee horizontal de la home. A diferencia de
 * `getVehiclesByManufacturer` (que deriva fabricantes on-the-fly desde
 * `Vehicle.manufacturer`), acá se usan las entidades reales para no listar
 * nada como placeholder: si un fabricante todavía no tiene entidad propia,
 * no aparece en el marquee.
 *
 * Orden alfabético (`localeCompare` con locale `es`) para que el loop no
 * dependa del orden de lectura del filesystem y sea estable entre builds.
 */
export async function getManufacturerMarqueeItems(): Promise<ManufacturerMarqueeItem[]> {
  const manufacturers = await getEntitiesByType(EntityType.MANUFACTURER)

  return manufacturers
    .map((entity) => ({
      slug: entity.slug,
      label: entity.title,
      image: resolveEntityDisplayImage(entity),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}
