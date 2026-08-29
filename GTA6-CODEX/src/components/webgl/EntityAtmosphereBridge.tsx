'use client'

import { memo, useEffect, useRef } from 'react'
import { EntityType, type InformationStatus } from '@/types'
import { useEntityAtmosphere } from '@/lib/hooks/useEntityAtmosphere'

/**
 * `EntityAtmosphereBridge` — el conducto semántico entre una ficha de
 * entidad y el motor WebGL (ver `scene-bus.ts` / `engine.ts`), hermano de
 * `SceneSection` pero para *contenido* en vez de *layout*: no dibuja nada
 * (`return null`) ni observa visibilidad — solo traduce quién es la entidad
 * que el usuario está leyendo (categoría, estado editorial, si es featured)
 * a la atmósfera que ya sabe interpretar `engine.ts`. Sigue delegando el
 * publish/cleanup real a `useEntityAtmosphere` (sin tocar): esa es la única
 * pieza autorizada a escribir en `webglSceneBus.setEntityAtmosphere`, así
 * que este componente nunca duplica esa responsabilidad.
 *
 * --------------------------------------------------------------------------
 * Por qué existe `CATEGORY_ALIAS`
 * --------------------------------------------------------------------------
 * `engine.ts` diferencia atmósfera en sus tablas `CATEGORY_WARMTH` /
 * `CATEGORY_PACE` / `CATEGORY_FRAME` usando claves heredadas del catálogo
 * original (personajes, organizaciones, negocios, vehículos, ubicaciones).
 * El sitio hoy solo tiene 3 `EntityType` (ver `@/types`): vehículos,
 * noticias, guías. `CATEGORY_ALIAS` traduce cada uno a la clave de esas
 * tablas más afín en tono narrativo, sin tocar `engine.ts`:
 *
 *  - vehículos → vehículos      (catálogo técnico, frío, preciso — mapeo directo)
 *  - noticias  → organizaciones (voz institucional/editorial)
 *  - guías     → ubicaciones    (orientación espacial, contemplativa)
 *
 * Es un `Record<EntityType, string>` exhaustivo a propósito: si el
 * proyecto agrega un `EntityType` nuevo el día de mañana, TypeScript deja
 * de compilar hasta que se decida su alias acá — no puede quedar ninguna
 * categoría nueva cayendo de nuevo en el fallback neutro por omisión.
 *
 * --------------------------------------------------------------------------
 * Qué señales de la lista pedida SÍ viajan al motor, y por qué el resto no
 * --------------------------------------------------------------------------
 * El contrato del bus para entidades (`EntityAtmosphere`) es deliberadamente
 * angosto: `{ category, status, featured }` — scene-bus.ts documenta que
 * ampliarlo con campos nuevos rompería a `engine.ts`, que lo consume como
 * literal. Sin tocar ese archivo, lo único que puede viajar es lo que ya
 * cabe en esos tres campos:
 *
 *  - **categoría** (tipo de entidad, ahora con alias) → mood/temperatura de
 *    color (`entityWarmth`), velocidad ambiental (`entityPace`),
 *    profundidad/encuadre y densidad de haze (`entityFrame`, que también
 *    gobierna la niebla — ver comentario en `engine.ts`).
 *  - **estado editorial** (`confirmado`/`rumor`/`nuestro`) → inquietud
 *    visual (`entityUnrest`: parpadeo de baliza/neón, grano), ya cubierto
 *    exhaustivamente por `STATUS_UNREST` — no necesita alias.
 *  - **featured** → énfasis/presencia (`entityPresence`, bloom); el orbe de
 *    `MagicCard` que sigue al cursor en fichas featured es una capa
 *    adicional que ya vive en la página, no acá.
 *  - **transiciones** entre categoría/estado/featured (entrada, salida,
 *    cambio de entidad) las suaviza `engine.ts` solo, interpolando cada
 *    target con lerp en cada frame — no hace falta (ni se puede, sin tocar
 *    ese archivo) publicar un evento de transición aparte.
 *
 * Identidad (slug), ubicación/contexto geográfico, hover, selección,
 * navegación, scroll y "contexto de página" no tienen transporte: no son
 * campos de `EntityAtmosphere`, y agregar listeners de scroll/pointer acá
 * (a) no tendría a dónde publicarse sin tocar `scene-bus.ts`, y (b)
 * duplicaría trabajo que ya hacen `engine.ts` (scroll global, pointermove)
 * y `Card`/`MagicCard` (hover real sobre UI) — exactamente lo que se pidió
 * evitar ("listeners duplicados"). Se documenta acá en vez de simularse con
 * props decorativas sin efecto real.
 */

export interface EntityAtmosphereBridgeProps {
  /** Tipo de la entidad (`EntityType`); ver `CATEGORY_ALIAS` para cómo se traduce a la atmósfera del motor. */
  category: EntityType
  /** Estado editorial — las 3 claves que ya cubre `STATUS_UNREST` en `engine.ts`, sin necesidad de alias. */
  status: InformationStatus
  featured: boolean
}

/**
 * Traduce cada `EntityType` a la clave que `engine.ts` sabe diferenciar en
 * `CATEGORY_WARMTH`/`CATEGORY_PACE`/`CATEGORY_FRAME` (claves heredadas del
 * catálogo original: 'vehiculos', 'organizaciones', 'ubicaciones', etc. —
 * ver documentación del archivo para el razonamiento de cada alias).
 *
 * `Record<EntityType, string>` exhaustivo: agregar un `EntityType` sin
 * agregar su entrada acá rompe el `tsc` de este archivo a propósito.
 */
const CATEGORY_ALIAS: Record<EntityType, string> = {
  [EntityType.VEHICLE]: 'vehiculos',
  [EntityType.NEWS]: 'organizaciones',
  [EntityType.GUIDE]: 'ubicaciones',
}

function EntityAtmosphereBridgeComponent({ category, status, featured }: EntityAtmosphereBridgeProps) {
  // Fallback defensivo: si algún día se agrega un EntityType sin tocar
  // `CATEGORY_ALIAS` (posible en JS puro o si el tipado se relaja en algún
  // caller), se envía la categoría original en vez de romper — el motor ya
  // sabe caer a neutro ante una clave desconocida, así que el peor caso es
  // idéntico al comportamiento previo a este cambio, nunca peor.
  const resolvedCategory = CATEGORY_ALIAS[category] ?? category

  // Única escritura real al bus: se delega por completo a `useEntityAtmosphere`
  // (mount → publica, unmount/cambio → limpia) para no duplicar la lógica de
  // publicación/cleanup que ese hook ya resuelve correctamente.
  useEntityAtmosphere({ category: resolvedCategory, status, featured })

  // Diagnóstico de desarrollo únicamente (no corre en producción, cero
  // costo ahí): dado que este componente no renderiza nada, es la única
  // forma de confirmar "en vivo" qué atmósfera resuelta le está llegando al
  // motor por cada entidad, y de ver "entrada"/"cambio entre entidades" al
  // navegar entre fichas durante el desarrollo.
  const previous = useRef<EntityAtmosphereBridgeProps | null>(null)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const prev = previous.current
    const describe = (p: EntityAtmosphereBridgeProps) => `${p.category}/${p.status}${p.featured ? '+featured' : ''}`
    if (prev) {
      console.debug(
        `[EntityAtmosphereBridge] ${describe(prev)} → ${describe({ category, status, featured })} ` +
          `(motor: ${resolvedCategory})`
      )
    } else {
      console.debug(`[EntityAtmosphereBridge] entrada: ${describe({ category, status, featured })} (motor: ${resolvedCategory})`)
    }
    previous.current = { category, status, featured }
  }, [category, status, featured, resolvedCategory])

  return null
}

EntityAtmosphereBridgeComponent.displayName = 'EntityAtmosphereBridge'

/**
 * `memo`: las tres props son siempre primitivas (string enum ×2 + boolean),
 * así que la comparación superficial de `memo` es exacta — evita volver a
 * correr el cuerpo del componente (y su hook) cuando el padre se
 * re-renderiza con los mismos valores.
 */
export const EntityAtmosphereBridge = memo(EntityAtmosphereBridgeComponent)
