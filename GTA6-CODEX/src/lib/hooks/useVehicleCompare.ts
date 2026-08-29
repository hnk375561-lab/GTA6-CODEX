'use client'

import { useMemo, useState } from 'react'
import type { Entity, Vehicle } from '@/types'
import { MAX_COMPARE } from '@/components/entities/VehicleCompareSheet'

/**
 * Estado del comparador de vehículos: hasta MAX_COMPARE slugs
 * seleccionados desde las cards/filas, más el estado de apertura del
 * panel. Extraído de EntityListExplorer porque es una pieza de estado
 * autocontenida (selección + apertura + derivación de los objetos
 * Vehicle completos) que no necesita conocer nada de búsqueda/filtros/
 * orden — separarla reduce el tamaño del componente que la usa y la deja
 * reutilizable si en el futuro el comparador aparece en otro lugar (ej.
 * la ficha individual de un vehículo).
 */
export function useVehicleCompare(entities: Entity[]) {
  const [compareSlugs, setCompareSlugs] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  const toggleCompare = (slug: string) => {
    setCompareSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, slug]
    })
  }

  const removeCompare = (slug: string) => setCompareSlugs((prev) => prev.filter((s) => s !== slug))

  const clearCompare = () => {
    setCompareSlugs([])
    setCompareOpen(false)
  }

  const compareVehicles = useMemo(
    () => compareSlugs.map((slug) => entities.find((e) => e.slug === slug)).filter((e): e is Vehicle => Boolean(e)),
    [compareSlugs, entities]
  )

  return {
    compareSlugs,
    compareOpen,
    compareVehicles,
    setCompareOpen,
    toggleCompare,
    removeCompare,
    clearCompare,
  }
}
