'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { EntityType } from '@/types'
import { Card } from '@/components/ui/Card'
import { Reveal } from './StageProgress'

export interface EvidenceShowcaseItem {
  slug: string
  entityType: EntityType
  title: string
  /**
   * El "dato" principal a destacar: potencia ("320 cv"), precio ("USD 45k"),
   * velocidad máxima ("241 km/h"), etc. Se extrae en `page.tsx` según el
   * tipo de entidad y los campos disponibles (preferencia: power → price →
   * performance.speed, en ese orden).
   */
  dataLabel: string
  dataValue: string
  /**
   * Contexto adicional si aplica: "Motor 2.0T, EE.UU." · "Último año
   * disponible" etc. Opcional, puede ser undefined.
   */
  dataNote?: string
  levelIcon: string
  levelLabel: string
  levelClassName: string
  primarySource: string
}

interface EvidenceShowcaseProps {
  items: EvidenceShowcaseItem[]
  /** Interval en ms para rotar items automáticamente (default: 6000) */
  autoRotateInterval?: number
}

/**
 * Storytelling visual de "un dato, una fuente": el diferencial editorial
 * del sitio hecho protagonista de la home como pieza narrativa interactiva.
 *
 * Patrón narrativo:
 * 1. Vista por defecto: "Potencia: 320 cv"
 * 2. Hover: revela fuente y nivel de confianza
 * 3. Rotación automática cada N segundos entre 2-3 ítems reales
 *
 * A diferencia de `EvidenceSpotlight` (grid estático de 6 cards), este
 * componente muestra un solo dato a la vez con foco narrativo — el "wow"
 * visual es el hover effect que revela que cada número tiene una fuente
 * citada detrás, no solo una lista de fichas. Dirigido a educación visual
 * de confianza/trazabilidad.
 */
export function EvidenceShowcase({ items, autoRotateInterval = 6000 }: EvidenceShowcaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const autoRotateTimer = useRef<NodeJS.Timeout | null>(null)

  // Rotación automática: avanza cada `autoRotateInterval` ms, pero pausa
  // si el usuario está hovereando (para que pueda leer la fuente).
  useEffect(() => {
    if (isHovering || items.length === 0) return

    autoRotateTimer.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, autoRotateInterval)

    return () => {
      if (autoRotateTimer.current) clearInterval(autoRotateTimer.current)
    }
  }, [isHovering, items.length, autoRotateInterval])

  if (items.length === 0) return null

  const current = items[currentIndex]

  return (
    <div className="mx-auto w-full max-w-[50rem]">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
        Diferencial del producto
      </p>
      <h2 className="mb-10 text-center font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
        Un dato, una fuente
      </h2>

      {/* Grid de indicadores de progreso (dots) — uno por item, mostrar
          cuál está activo. Clickeable para saltarse a ese item. */}
      <div className="mb-8 flex justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentIndex(i)
              // Reset automático rotate al hacer click
              if (autoRotateTimer.current) clearInterval(autoRotateTimer.current)
            }}
            className={`relative h-2 rounded-full transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent focus-visible:ring-offset-2 active:scale-90 before:absolute before:-inset-2 before:rounded-full before:content-[''] before:hover:bg-neutral-300/25 ${
              i === currentIndex ? 'w-8 bg-orange-600' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
            }`}
            aria-label={`Ir a dato ${i + 1} de ${items.length}`}
            aria-current={i === currentIndex ? 'true' : 'false'}
          />
        ))}
      </div>

      {/* Card principal: dato destacado + hover revela fuente */}
      <Reveal index={0} total={1} className="h-full">
        {/* `Card` (src/components/ui/Card.tsx) no expone onMouseEnter/
            onMouseLeave en su `CardProps` — se envuelve en un div que
            capta el hover en la misma superficie, sin tocar ese
            componente compartido por el resto del sitio. */}
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <Card className="relative overflow-hidden !p-0">
            {/* Estado por defecto: dato protagonista */}
            <div className={`p-8 transition-opacity duration-500 ${isHovering ? 'opacity-0' : 'opacity-100'}`}>
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-neutral-500">
                  {current.dataLabel}
                </p>
                <p className="font-display text-5xl font-bold text-neutral-900 sm:text-6xl">
                  {current.dataValue}
                </p>
                {current.dataNote && (
                  <p className="text-xs text-neutral-500">{current.dataNote}</p>
                )}
                <Link
                  href={`/${current.entityType}/${current.slug}`}
                  className="group mt-2 inline-flex items-center gap-1 font-display text-sm font-semibold text-orange-600 transition duration-200 hover:text-orange-700"
                >
                  {current.title}
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/* Estado hover: fuente + nivel de confianza */}
            <div className={`absolute inset-0 flex flex-col justify-between p-8 transition-opacity duration-500 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}>
              <div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${current.levelClassName}`}>
                  <span aria-hidden="true">{current.levelIcon}</span>
                  {current.levelLabel}
                </span>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                  Fuente primaria
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-900">
                  {current.primarySource}
                </p>
              </div>

              <p className="text-xs text-neutral-500">
                Cada dato cita su fuente y nivel de confianza
              </p>
            </div>

            {/* Gradient overlay para suavidad visual */}
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-900/5 transition-opacity duration-500 ${
              isHovering ? 'opacity-0' : 'opacity-100'
            }`} />
          </Card>
        </div>
      </Reveal>

      {/* Hint para usuario: "Hover para ver fuente" */}
      <p className="mt-6 text-center text-xs text-neutral-500">
        {items.length > 1 && (
          <>Pasa el mouse para ver la fuente · </>
        )}
        {items.length > 1 ? `Rotando automáticamente (${items.length} datos)` : 'Pasa el mouse para ver la fuente'}
      </p>
    </div>
  )
}
