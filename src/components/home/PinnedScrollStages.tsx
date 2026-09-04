'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Stage {
  id: string
  label: string
  scrollVh?: number
  content: ReactNode
}

interface Props {
  stages: Stage[]
}

export function PinnedScrollStages({ stages }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeStageId, setActiveStageId] = useState<string | null>(stages[0]?.id || null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement
          if (entry.isIntersecting) {
            const id = target.getAttribute('data-stage-id')
            if (id) {
              setActiveStageId(id)
              target.classList.add('is-active')
            }
          }
        })
      },
      {
        root: container,
        threshold: 0.6,
      }
    )

    const items = container.querySelectorAll('[data-stage-id]')
    items.forEach((item) => observer.observe(item))

    const firstItem = container.querySelector('[data-stage-id]') as HTMLElement
    if (firstItem) {
       setTimeout(() => firstItem.classList.add('is-active'), 50)
    }

    return () => observer.disconnect()
  }, [stages])

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-dvh w-full overflow-y-scroll scroll-smooth snap-y snap-mandatory scroll-container-custom"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx global>{`
          .scroll-container-custom::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {stages.map((stage) => (
          <section
            key={stage.id}
            data-stage-id={stage.id}
            className={cn(
              'stage-panel h-dvh w-full snap-start flex items-center justify-center p-4 sm:p-6 lg:p-8',
              'opacity-0 transition-opacity duration-700 ease-out',
              'will-change-[opacity]'
            )}
          >
            <div className="w-full max-w-7xl">
               {stage.content}
            </div>
          </section>
        ))}
      </div>

      <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3" aria-label="Progreso de secciones">
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => {
              const target = containerRef.current?.querySelector(`[data-stage-id="${stage.id}"]`)
              target?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-auto-accent',
              activeStageId === stage.id
                ? 'bg-neutral-900 scale-125'
                : 'bg-neutral-300 hover:bg-neutral-400'
            )}
            aria-label={`Ir a ${stage.label}`}
          />
        ))}
      </nav>
    </div>
  )
}
