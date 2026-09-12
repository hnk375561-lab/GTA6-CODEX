'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface ClassificationEntry {
  position: number
  vehicleSlug: string
  vehicleTitle: string
  metricValue: number
  metricLabel: string
}

export interface Classification {
  slug: string
  shortTitle: string
  title: string
  direction: 'min' | 'max'
  topEntries: ClassificationEntry[]
  eligibleCount: number
}

interface ArchiveClassificationsProps {
  classifications: Classification[]
}

/**
 * ÍNDICES / CLASIFICACIONES DEL ARCHIVO
 * Reemplaza RankingsSpotlight con presentación documental
 * 
 * Concepto: índices clasificados por criterio técnico,
 * presentación tipo tabla de contenido/ índice de archivo
 */
export function ArchiveClassifications({ classifications }: ArchiveClassificationsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [displayedIndex, setDisplayedIndex] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)
  const pendingIndexRef = useRef<number | null>(null)

  useEffect(() => {
    if (!fadingOut) return
    const timer = setTimeout(() => {
      if (pendingIndexRef.current !== null) {
        setDisplayedIndex(pendingIndexRef.current)
        pendingIndexRef.current = null
      }
      setFadingOut(false)
    }, 220)
    return () => clearTimeout(timer)
  }, [fadingOut])

  const selectTab = (index: number) => {
    if (index === activeIndex) return
    setActiveIndex(index)
    pendingIndexRef.current = index
    setFadingOut(true)
  }

  const classification = classifications[displayedIndex]
  if (!classification) return null

  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-paper border-t border-border">
      <div className="container-max">
        {/* Encabezado de sección */}
        <div className="mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
              ÍNDICES DEL ARCHIVO
            </span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink text-center">
            Clasificaciones técnicas
          </h2>
          <p className="font-sans text-ink/60 text-center mt-4 max-w-2xl mx-auto">
            Índices ordenados por criterios objetivos: potencia, precio, consumo.
            Cada clasificación se basa en datos verificables de las fichas.
          </p>
        </div>

        {/* Tabs de clasificación */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {classifications.map((c, i) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => selectTab(i)}
              className={cn(
                'relative font-mono text-xs uppercase tracking-[0.15em] px-4 py-2 border transition-colors',
                i === activeIndex
                  ? 'border-oxide-red bg-oxide-red/5 text-ink'
                  : 'border-border text-ink/60 hover:border-ink/30 hover:text-ink'
              )}
            >
              {c.shortTitle}
              {i === activeIndex && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[5px] left-1/2 h-[3px] w-3 -translate-x-1/2 bg-oxide-red"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tabla de clasificación */}
        <div
          className="max-w-2xl mx-auto bg-surface-card border border-border shadow-md"
          style={{
            opacity: fadingOut ? 0 : 1,
            transition: 'opacity 220ms ease-in-out',
          }}
        >
          {/* Cabecera de tabla */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-paper/50">
            <div>
              <h3 className="font-serif text-lg font-semibold text-ink">
                {classification.shortTitle}
              </h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/50 mt-1">
                {classification.eligibleCount} fichas elegibles
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-wider text-ink/40">
                CRITERIO
              </p>
              <p className="font-mono text-xs text-ink/70">
                {classification.direction === 'min' ? 'Menor' : 'Mayor'} valor
              </p>
            </div>
          </div>

          {/* Lista de clasificación */}
          <ol className="divide-y divide-border">
            {classification.topEntries.map((entry, i) => (
              <li key={entry.vehicleSlug} className="flex items-center gap-4 px-6 py-4 hover:bg-paper/30 transition-colors">
                {/* Posición */}
                <span className="font-mono text-sm font-semibold text-ink/40 w-6 text-right">
                  {String(entry.position).padStart(2, '0')}
                </span>

                {/* Título del vehículo */}
                <Link
                  href={`/vehiculos/${entry.vehicleSlug}`}
                  prefetch={false}
                  className="flex-1 min-w-0 font-serif text-sm font-medium text-ink hover:text-oxide-red transition-colors truncate"
                >
                  {entry.vehicleTitle}
                </Link>

                {/* Valor métrico */}
                <span className="font-mono text-sm text-ink/70 tabular-nums">
                  {entry.metricLabel}
                </span>

                {/* Indicador de top */}
                {i === 0 && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-archive-green border border-archive-green/30 px-1.5 py-0.5">
                    TOP
                  </span>
                )}
              </li>
            ))}
          </ol>

          {/* Pie de tabla */}
          <div className="px-6 py-4 border-t border-border bg-paper/30 text-center">
            <Link
              href={`/rankings/${classification.slug}`}
              prefetch={false}
              className="font-mono text-xs uppercase tracking-[0.15em] text-oxide-red hover:text-ink transition-colors inline-flex items-center gap-2"
            >
              Ver clasificación completa →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
