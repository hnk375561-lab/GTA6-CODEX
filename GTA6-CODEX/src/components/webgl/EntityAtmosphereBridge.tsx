'use client'

import { useEntityAtmosphere } from '@/lib/hooks/useEntityAtmosphere'
import type { EntityAtmosphere } from '@/lib/webgl/scene-bus'

/**
 * No renderiza nada — es el punto de instrumentación que le permite a una
 * ficha de entidad "hablar" con la escena WebGL (categoría, estado
 * editorial, featured), igual que `SceneSection` hace con secciones. Vive
 * como componente aparte (en vez de un efecto suelto en la página) para
 * mantener el patrón de integración consistente y reutilizable.
 */
export function EntityAtmosphereBridge(props: EntityAtmosphere) {
  useEntityAtmosphere(props)
  return null
}
