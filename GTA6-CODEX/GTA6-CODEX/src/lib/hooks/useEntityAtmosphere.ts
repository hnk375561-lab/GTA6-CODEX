'use client'

import { useEffect } from 'react'
import { webglSceneBus, type EntityAtmosphere } from '@/lib/webgl/scene-bus'

/**
 * Publica la atmósfera de la ficha de entidad actual (categoría, estado
 * editorial, si es featured) al montar, y la limpia al desmontar/cambiar de
 * ficha. Son datos que ya existen en el contenido — no se inventa nada.
 */
export function useEntityAtmosphere(atmosphere: EntityAtmosphere) {
  const { category, status, featured } = atmosphere

  useEffect(() => {
    webglSceneBus.setEntityAtmosphere({ category, status, featured })
    return () => webglSceneBus.setEntityAtmosphere(null)
  }, [category, status, featured])
}
