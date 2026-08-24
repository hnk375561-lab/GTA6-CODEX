'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Error boundary de ruta (App Router). Captura excepciones lanzadas por
 * Server/Client Components dentro de un segmento y evita que el usuario
 * caiga en la pantalla de error genérica de Next. Mismo lenguaje visual
 * que `not-found.tsx` para que un fallo se sienta parte del sitio, no un
 * cuelgue técnico.
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
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="container-narrow py-20 text-center">
        <div className="mb-8">
          <p className="eyebrow mb-4 text-xs font-semibold uppercase text-gta-accent-strong">
            Expediente · Error
          </p>
          <div className="text-gradient-vice mb-4 font-display text-8xl font-bold sm:text-9xl">
            !
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gta-text sm:text-4xl">
            Algo salió mal
          </h1>
          <p className="mb-8 text-lg text-gta-text-secondary">
            Hubo un error al cargar esta página. Podés intentar de nuevo o volver al inicio.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => reset()}
              className="btn-primary inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-semibold text-gta-darker transition-all hover:-translate-y-0.5"
            >
              Reintentar
            </button>
            <Link
              href="/"
              className="link-underline text-gta-accent-strong transition-colors hover:text-gta-accent"
            >
              Volver a Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
