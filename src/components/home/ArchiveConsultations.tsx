'use client'

import { useId, useState } from 'react'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/utils'

export interface ConsultationItem {
  question: string
  answer: string
}

interface ArchiveConsultationsProps {
  items: ConsultationItem[]
}

/**
 * CONSULTAS DEL ARCHIVO
 * Reemplaza HomeFaqPanel con presentación documental
 * 
 * Concepto: preguntas frecuentes presentadas como
 * consultas de archivo, con formato de documento
 */
export function ArchiveConsultations({ items }: ArchiveConsultationsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const baseId = useId()

  if (items.length === 0) return null

  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-paper border-t border-border">
      <div className="container-max">
        {/* Encabezado de sección */}
        <Reveal className="mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">
              CONSULTAS DEL ARCHIVO
            </span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink text-center">
            Preguntas frecuentes
          </h2>
          <p className="font-sans text-ink/60 text-center mt-4 max-w-2xl mx-auto">
            Consultas habituales sobre el archivo, los datos y su verificación.
          </p>
        </Reveal>

        {/* Lista de consultas tipo documento */}
        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((item, index) => {
            const open = openIndex === index
            const panelId = `${baseId}-panel-${index}`
            const buttonId = `${baseId}-button-${index}`

            return (
              <Reveal key={item.question} delay={index * 50}>
                <div className={cn(
                  'bg-surface-card border border-border transition-shadow duration-200',
                  open ? 'shadow-md' : 'hover:shadow-sm'
                )}>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-paper/30 transition-colors focus:outline-none focus:ring-2 focus:ring-oxide-red/50 focus:ring-inset"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <span className="font-mono text-xs text-ink/40 uppercase tracking-wider flex-shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-serif text-base font-medium text-ink leading-snug">
                        {item.question}
                      </h3>
                    </div>
                    <span className="flex-shrink-0 text-oxide-red transition-transform duration-200" style={{
                      transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                  
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={cn(
                      'px-6 overflow-hidden transition-all duration-200 ease-in-out',
                      open ? 'max-h-96 pb-4' : 'max-h-0'
                    )}
                  >
                    <div className="pt-3 border-t border-border/50 pl-10">
                      <p className="font-sans text-sm text-ink/70 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* Referencia a contacto */}
        <Reveal delay={items.length * 50 + 100} className="mt-12 text-center">
          <p className="font-mono text-xs text-ink/50 uppercase tracking-[0.15em] mb-4">
            ¿No encontrás tu consulta?
          </p>
          <a
            href="mailto:contacto@sinfrenos.com.ar"
            className="font-mono text-xs uppercase tracking-[0.15em] text-oxide-red hover:text-ink transition-colors inline-flex items-center gap-2 border-b border-transparent hover:border-ink/30"
          >
            Contactar al archivo →
          </a>
        </Reveal>
      </div>
    </section>
  )
}
