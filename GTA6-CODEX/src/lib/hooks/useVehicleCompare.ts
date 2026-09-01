'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Entity, Vehicle } from '@/types'
import { MAX_COMPARE } from '@/components/entities/VehicleCompareSheet'

/** Mismo patrón que `sinfrenos:wishlist` (ver `useWishlist.ts`): persiste
 *  la selección del comparador en `localStorage` (Oportunidad #10 de la
 *  auditoría "AutoFicha: aprovechamiento de datos" — hoy se perdía al
 *  cerrar la pestaña o navegar entre listado y `/comparar`). Clave
 *  distinta a la wishlist porque son conceptos independientes: un
 *  vehículo puede estar en comparación sin estar en favoritos y viceversa. */
const STORAGE_KEY = 'sinfrenos:compare'

export function readCompareStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_COMPARE)
  } catch {
    // localStorage corrupto/deshabilitado: arranca vacío, igual que
    // useWishlist en el mismo caso.
    return []
  }
}

export function writeCompareStorage(slugs: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    // Cuota excedida o storage deshabilitado: falla en silencio, no
    // rompe la interacción — la selección simplemente no persiste.
  }
}

/**
 * Estado del comparador de vehículos: hasta MAX_COMPARE slugs
 * seleccionados desde las cards/filas, más el estado de apertura del
 * panel. Extraído de EntityListExplorer porque es una pieza de estado
 * autocontenida (selección + apertura + derivación de los objetos
 * Vehicle completos) que no necesita conocer nada de búsqueda/filtros/
 * orden — separarla reduce el tamaño del componente que la usa y la deja
 * reutilizable si en el futuro el comparador aparece en otro lugar (ej.
 * la ficha individual de un vehículo).
 *
 * La selección persiste en `localStorage` (ver arriba): arranca vacía en
 * el server/primer render de cliente y se hidrata en el primer efecto,
 * mismo patrón que `useWishlist`, para evitar mismatch de hidratación.
 */
export function useVehicleCompare(entities: Entity[]) {
  const [compareSlugs, setCompareSlugs] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  useEffect(() => {
    setCompareSlugs(readCompareStorage())
  }, [])

  const toggleCompare = (slug: string) => {
    setCompareSlugs((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, slug]
      writeCompareStorage(next)
      return next
    })
  }

  const removeCompare = (slug: string) =>
    setCompareSlugs((prev) => {
      const next = prev.filter((s) => s !== slug)
      writeCompareStorage(next)
      return next
    })

  const clearCompare = () => {
    setCompareSlugs([])
    writeCompareStorage([])
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
