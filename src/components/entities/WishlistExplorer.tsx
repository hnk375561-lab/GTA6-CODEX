'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Entity } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { EntityCard } from '@/components/entities/EntityCard'
import { Reveal } from '@/components/ui/Reveal'
import { useWishlist, wishlistId } from '@/lib/hooks/useWishlist'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'

interface WishlistExplorerProps {
  entities: Entity[]
  imageBySlug: Record<string, ResolvedDisplayImage | null>
}

/**
 * Página `/favoritos`: filtra `entities` (todas las entidades del sitio,
 * resueltas server-side por el `page.tsx` que envuelve a este componente)
 * contra los ids guardados en `localStorage` vía `useWishlist`. No hace
 * falta ningún fetch propio — la wishlist es solo una lista de ids, la
 * data completa de cada entidad ya viene del listado general, igual que
 * `CompareExplorer` reutiliza `vehicles` para `/comparar`.
 */
export function WishlistExplorer({ entities, imageBySlug }: WishlistExplorerProps) {
  const { ids, hydrated, count, clearWishlist } = useWishlist()

  // "Vaciar favoritos" borra TODO de forma irrecuperable (localStorage, sin
  // backend ni historial), así que necesita confirmación explícita: el
  // primer toque arma el estado de confirmación (botón en rojo + aviso
  // accesible), el segundo ejecuta. Si no se confirma en 4s, se revierte
  // solo para no dejar una trampa armada colgando.
  const [confirmClear, setConfirmClear] = useState(false)
  const confirmClearTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (confirmClearTimer.current !== null) {
        window.clearTimeout(confirmClearTimer.current)
      }
    }
  }, [])

  function requestClearWishlist() {
    if (confirmClear) {
      if (confirmClearTimer.current !== null) {
        window.clearTimeout(confirmClearTimer.current)
        confirmClearTimer.current = null
      }
      clearWishlist()
      return
    }
    setConfirmClear(true)
    confirmClearTimer.current = window.setTimeout(() => {
      setConfirmClear(false)
      confirmClearTimer.current = null
    }, 4000)
  }

  const saved = entities.filter((entity) => ids.has(wishlistId(entity.type, entity.slug)))

  // Antes de hidratar (primer render en cliente, antes del efecto que lee
  // localStorage) no se sabe todavía qué hay guardado — mostrar el estado
  // vacío en ese instante parpadearía a la lista real medio segundo
  // después. Un placeholder neutro evita ese salto visual.
  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl border border-edge bg-surface-card" />
        ))}
      </div>
    )
  }

  if (count === 0 || saved.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge bg-surface-card px-6 py-16 text-center">
        <p className="text-lg font-semibold text-neutral-900">Todavía no guardaste favoritos</p>
        <p className="max-w-sm text-sm text-neutral-500">
          Tocá el corazón en cualquier ficha para agregarla acá. Se guarda solo en este navegador.
        </p>
        <Link
          href="/vehiculos"
          className="mt-2 inline-flex items-center rounded-lg bg-auto-accent px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-auto-accent-strong active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
        >
          Ver vehículos
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          {saved.length} {saved.length === 1 ? 'guardado' : 'guardados'}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {confirmClear && (
            <span role="alert" className="text-xs font-medium text-red-500">
              Vaciar todos los favoritos no se puede deshacer.
            </span>
          )}
          <button
            type="button"
            onClick={requestClearWishlist}
            aria-pressed={confirmClear}
            className={
              confirmClear
                ? 'rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-sm font-semibold text-red-600 transition duration-200 hover:bg-red-100 active:scale-[0.97]'
                : 'text-sm font-semibold text-neutral-500 transition duration-200 hover:text-auto-accent-strong active:scale-[0.97] active:text-auto-accent-strong'
            }
          >
            {confirmClear ? '¿Seguro? Vaciar todos' : 'Vaciar favoritos'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {saved.map((entity, i) => (
          <Reveal key={`${entity.type}/${entity.slug}`} delay={(i % 6) * 80} className="entity-card-viewport">
            <EntityCard
              entity={entity}
              image={imageBySlug?.[`${entity.type}/${entity.slug}`]}
              typeLabel={ENTITY_TYPE_LABELS[entity.type]}
            />
          </Reveal>
        ))}
      </div>
    </div>
  )
}
