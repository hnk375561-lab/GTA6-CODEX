'use client'

import { useState } from 'react'
import Link from 'next/link'
import { categoryToSlug, type CategoryQuickFilterOption } from '@/lib/vehicle-category'
import { cn } from '@/lib/utils'

interface CategoryQuickFilterProps {
  /** Ver `computeCategoryQuickFilterOptions` en `vehicle-category.ts` —
   *  solo categorías con página SEO real, cada una con su conteo y una
   *  muestra de títulos reales del catálogo. */
  options: CategoryQuickFilterOption[]
}

/**
 * Filtro rápido de carrocería (FASE 5, Prioridad B — "Filtro rápido
 * inline por tipo de carrocería en Categorías, sin salir de home").
 *
 * Se probó la alternativa obvia primero (un chip que linkea directo a
 * `/categorias/[grupo]`) y se descartó: eso ya existe como flujo
 * completo en `/categorias`, y un link no es un "filtro", es solo
 * navegación más corta. Acá el click NO navega — abre un panel inline
 * con una muestra real de esa categoría (títulos que sí existen hoy en
 * el catálogo, ver `computeCategoryQuickFilterOptions`) para que la
 * persona pueda comparar 2-3 categorías sin perder el scroll de la
 * home ni la posición del stage en el que está parada. El CTA a la
 * página completa de la categoría queda como salida explícita, no como
 * comportamiento del click en el chip.
 */
export function CategoryQuickFilter({ options }: CategoryQuickFilterProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Si el catálogo no tiene ninguna categoría con página SEO real
  // (caso borde, no pasa hoy con 250 vehículos), el filtro no tiene
  // nada útil que mostrar — se omite entero en vez de renderizar una
  // fila vacía de chips.
  if (options.length === 0) return null

  const active = activeIndex !== null ? options[activeIndex] : null

  return (
    <div className="mt-10">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
        Filtro rápido por carrocería
      </p>
      <div
        role="group"
        aria-label="Filtrar vehículos por tipo de carrocería"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {options.map((option, i) => {
          const isActive = i === activeIndex
          return (
            <button
              key={option.group}
              type="button"
              aria-pressed={isActive}
              // Toggle: tocar el chip activo lo cierra, en vez de quedar
              // pegado — mismo criterio que cualquier filtro de un solo
              // valor (no hace falta un botón "Limpiar" aparte).
              onClick={() => setActiveIndex(isActive ? null : i)}
              className={cn(
                'tap-scale rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
              )}
            >
              {option.group}{' '}
              <span className={isActive ? 'text-white/70' : 'text-neutral-400'}>({option.count})</span>
            </button>
          )
        })}
      </div>

      {/* Panel inline: solo se monta cuando hay una categoría activa, no
          se oculta con CSS — evita que un lector de pantalla anuncie un
          bloque vacío mientras no hay selección. */}
      {active && (
        <div className="mx-auto mt-5 max-w-xl rounded-xl border border-neutral-200 bg-white p-5 text-center shadow-sm">
          <p className="text-sm text-neutral-600">
            {active.examples.join(' · ')}
            {active.count > active.examples.length && (
              <span className="text-neutral-400"> y {active.count - active.examples.length} más</span>
            )}
          </p>
          <Link
            href={`/categorias/${categoryToSlug(active.group)}`}
            className="group mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition duration-200 hover:text-orange-700"
          >
            Ver los {active.count} {active.group}
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
