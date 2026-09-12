'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Error boundary de ruta (App Router). Captura excepciones lanzadas por
 * Server/Client Components dentro de un segmento y evita que el usuario
 * caiga en la pantalla de error genérica de Next. Mismo lenguaje visual
 * que `not-found.tsx` (paper/ink/oxide-red, font-serif, CTA con
 * bg-oxide-red + text-white) para que un fallo se sienta parte del
 * sitio, no un cuelgue técnico.
 *
 * FIX (auditoría UX Pase 1, hallazgo 1.3): el botón "Reintentar" usaba
 * la clase 'btn-primary', que no existe en ningún .css del proyecto, y
 * texto 'text-auto-darker' (casi negro) sin fondo detrás — quedaba
 * invisible justo en el único momento de recuperación disponible
 * cuando algo se rompe. Se reescribió para igualar not-found.tsx.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log mínimo en consola del servidor/cliente para diagnóstico; no se
    // envía a ningún servicio externo desde acá — conectar con el
    // proveedor de error-tracking que se elija (Sentry, etc.) es una
    // mejora aparte, no parte de este fix.
    console.error('[error.tsx]', error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="container-narrow py-20 text-center">
        {/* Eyebrow: etiqueta de contexto */}
        <div className="mb-12">
          <p className="eyebrow mb-4 text-xs font-semibold uppercase text-oxide-red">
            Expediente · Error
          </p>

          {/* Heading principal con énfasis visual */}
          <div className="mb-6">
            <div className="mb-4 font-serif text-8xl font-bold tracking-tight sm:text-9xl">
              <span className="block text-ink/20">!</span>
            </div>
            <h1 className="mb-4 font-serif text-4xl font-bold text-ink sm:text-5xl">
              Algo salió mal
            </h1>
          </div>

          {/* Explicación clara del problema */}
          <p className="mx-auto max-w-md text-lg text-ink/70 leading-relaxed">
            Hubo un error al cargar esta página. Podés intentar de nuevo o
            volver al inicio.
          </p>
        </div>

        {/* CTAs de recuperación: claras y accesibles */}
        <div className="space-y-4">
          {/* CTA primaria: reintentar */}
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-lg bg-oxide-red px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-white transition-transform duration-200 hover:scale-105 hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxide-red"
          >
            Reintentar
          </button>

          {/* CTA secundaria: volver a inicio */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 text-oxide-red transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxide-red"
            >
              <span className="font-mono text-xs uppercase tracking-[0.1em]">
                Volver a Inicio
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
