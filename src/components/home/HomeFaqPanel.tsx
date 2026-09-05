'use client'

import { useId, useState } from 'react'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/utils'

export interface FaqItem {
  question: string
  answer: string
}

interface HomeFaqPanelProps {
  items: FaqItem[]
}

/** Ícono +/− lineal, mismo lenguaje de trazo (stroke 2) que el resto de
 *  íconos del sitio (`WishlistButton`, `VehicleCompareSheet`) en vez de
 *  un glifo de librería suelto. Rota 45° cuando el panel está abierto,
 *  así el mismo trazo hace de "+" y de "×" sin cambiar de ícono. */
function TogglePlusIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn('shrink-0 transition-transform duration-300', open && 'rotate-45')}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/**
 * FAQ corta y visual antes del footer (Prioridad C). Vive en scroll
 * normal, no en el track de `PinnedScrollStages`: la home rediseñada
 * (ver comentario largo en `page.tsx`) fija el viewport panel por panel
 * hasta el CTA final ("Decidí") y ahí el documento vuelve a scrollear
 * como una página común — este panel aprovecha exactamente ese tramo,
 * entre el final del track y `<Footer />` (que renderiza `layout.tsx`),
 * en vez de sumar un décimo `Stage` al crossfade (que ya venía marcado
 * como riesgo a monitorear: cada panel nuevo cuesta scroll físico
 * completo antes de dar contenido — ver ese mismo comentario).
 *
 * Acordeón simple (una pregunta abierta a la vez, sin librería), con
 * `Reveal`/`.reveal` (IntersectionObserver, `ui/Reveal.tsx`) para la
 * entrada — no el `Reveal` de `home/StageProgress.tsx`, que depende del
 * `StageProgressProvider` del track y no existe acá.
 */
export function HomeFaqPanel({ items }: HomeFaqPanelProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const baseId = useId()

  if (items.length === 0) return null

  return (
    <section className="relative border-t border-edge bg-surface-page py-16 sm:py-20" aria-labelledby={`${baseId}-heading`}>
      <div className="container-max">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Preguntas frecuentes
          </p>
          <h2 id={`${baseId}-heading`} className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Antes de que te vayas
          </h2>
        </Reveal>

        <div className="mx-auto max-w-2xl divide-y divide-edge rounded-2xl border border-edge bg-surface-card/40">
          {items.map((item, index) => {
            const open = openIndex === index
            const panelId = `${baseId}-panel-${index}`
            const buttonId = `${baseId}-button-${index}`
            return (
              <Reveal key={item.question} delay={index * 60}>
                <div>
                  <h3 className="m-0">
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(open ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-neutral-900 transition-colors hover:text-auto-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent sm:text-base"
                    >
                      {item.question}
                      <span className="text-auto-accent">
                        <TogglePlusIcon open={open} />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={cn('faq-answer', open && 'faq-answer-open')}
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed text-neutral-500">{item.answer}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
