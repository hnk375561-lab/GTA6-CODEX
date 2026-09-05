'use client'

import Link from 'next/link'
import { Reveal } from '@/components/ui/Reveal'

/* Cierre del recorrido de la home, después del FAQ.

   La home termina donde termina el documento: el FAQ (`HomeFaqPanel`)
   es la última unidad de contenido y el `<Footer />` está oculto en el
   home (`HideOnHome` en layout.tsx). La última acción del track ("Decidí")
   quedó varios viewports atrás, así que acá el sitio responde el "¿y
   ahora qué?" final — no con otro CTA de venta, sino con la vía de
   regreso natural del expediente:
     - repasar el recorrido (rebobina el track al hero), o
     - saltar directo a la comparación (`/comparar`, el destino con mayor
       intención de decisión después de haber leído todo el expediente).
   Un solo primario + un link. La única pieza nueva de lógica es el
   "rewind": el track scrollea INTERNO (`data-home-track`), así que
   volver arriba exige resetear ese scroller y el de `window` — el FAB
   global no puede (según sus propias reglas nunca toca scroll interno).
   Reduced-motion: el rebobinado es instantáneo (`behavior: 'auto'`). */
export function FaqClosure() {
  const rewind = () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth'
    const track = document.querySelector<HTMLElement>('[data-home-track]')
    if (track) track.scrollTo({ top: 0, behavior })
    window.scrollTo({ top: 0, behavior })
  }

  return (
    <section
      className="border-t border-edge bg-white pb-16 pt-2 sm:pb-20"
      aria-labelledby="faq-closure-heading"
    >
      <div className="container-max">
        <Reveal className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-edge bg-surface-card/40 px-6 py-10 text-center sm:px-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
              Expediente completo
            </p>
            <h2
              id="faq-closure-heading"
              className="font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl"
            >
              El expediente queda abierto
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-500">
              Si todavía dudás, el recorrido sigue acá: volvé a mirar lo que viste o pasá
              directo a la comparación con todos los criterios.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={rewind}
                className="tap-scale rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Repasá el recorrido
              </button>
              <Link
                href="/comparar"
                className="group text-sm font-semibold text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-900"
              >
                Comparar dos modelos{' '}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}