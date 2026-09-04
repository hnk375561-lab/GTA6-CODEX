/**
 * src/lib/scroll/fab-layer.ts
 * ============================================================
 * Docks del pie del viewport (pub/sub mínimo y acotado) para el botón
 * global "Volver arriba" (BackToTop.tsx).
 *
 * POR QUÉ EXISTE:
 *   El FAB flota fijo en el pie-derecho del viewport. En mobile conviven
 *   otros elementos fijos en esa franja (anuncio ancla + la barra del
 *   comparador) y un modal que la tapa por completo (el panel comparador).
 *   Sin coordinación, el FAB podría quedar encima de la barra del
 *   comparador, del anuncio ancla o del panel abierto — exactamente lo que
 *   la tarea de regreso-arriba prohíbe ("no dos botones superpuestos").
 *
 *   Cada componente que se asienta en el pie anuncia su capa al FAB:
 *
 *     - 'anchor-ad'      → StickyAdUnit (mobile). Altura del anuncio ancla.
 *     - 'compare-bar'    → VehicleCompareBar. Altura de la barra del
 *                          comparador (mobile y desktop).
 *     - 'compare-sheet'  → VehicleCompareSheet. hide=true mientras el
 *                          panel modal está abierto (el FAB comparte z-50
 *                          con el panel; con el documento bloqueado no
 *                          tiene función y además taparía el panel).
 *
 *   EL FAB (BackToTop) se suscribe y recalcula:
 *     dockHeight = mayor altura de las capas visibles (el ancla y la
 *     barra del comparador conviven en bottom:0 — la barra está por
 *     encima del ancla en z — así que la altura efectiva es el máximo,
 *     no la suma), y se oculta si cualquier capa marca hide.
 *
 *   Sin observadores globales ni listeners de scroll extra: cada emisor
 *   mide su propio elemento con un ResizeObserver local (más resize/
 *   orientationchange) y solo avisa cuando el valor cambia.
 */

export type FabLayer = {
  /** Altura vertical (px) que ocupa la capa en el pie del viewport. */
  height?: number
  /** true = la capa cubre la zona del FAB: hay que ocultarlo. */
  hide?: boolean
}

const LAYERS = new Map<string, FabLayer>()
const LISTENERS = new Set<() => void>()

export const FAB_LAYER_ANCHOR_AD = 'anchor-ad'
export const FAB_LAYER_COMPARE_BAR = 'compare-bar'
export const FAB_LAYER_COMPARE_SHEET = 'compare-sheet'

function emit() {
  // El Set se copia antes de iterar: un listener puede darse de baja
  // dentro de su propio callback sin romper la iteración.
  for (const listener of [...LISTENERS]) listener()
}

/** Anuncia (o retira, con `null`) la capa de un componente del pie. */
export function setFabLayer(id: string, layer: FabLayer | null) {
  if (layer === null) {
    if (LAYERS.delete(id)) emit()
    return
  }
  const previous = LAYERS.get(id)
  if (
    previous &&
    previous.hide === layer.hide &&
    (previous.height ?? 0) === (layer.height ?? 0)
  ) {
    return
  }
  LAYERS.set(id, layer)
  emit()
}

/** Estado agregado que el FAB necesita para posicionarse. */
export function getFabLayout(): { dockHeight: number; hidden: boolean } {
  let dockHeight = 0
  let hidden = false
  LAYERS.forEach((layer) => {
    if (layer.hide) hidden = true
    if ((layer.height ?? 0) > dockHeight) dockHeight = layer.height ?? 0
  })
  return { dockHeight, hidden }
}

/**
 * Suscriptor del FAB. Devuelve el unsubscribe. Llamada inmediata con el
 * estado actual para que el FAB arranque bien posicionado aunque todos
 * los emisores se monten después que él.
 */
export function subscribeFabLayout(listener: () => void): () => void {
  LISTENERS.add(listener)
  listener()
  return () => {
    LISTENERS.delete(listener)
  }
}