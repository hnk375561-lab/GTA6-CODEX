'use client'

import { useEffect } from 'react'

/**
 * Boundary de error raíz (App Router). Solo se activa si el propio
 * `layout.tsx` falla al renderizar — por eso debe incluir <html>/<body>
 * propios: reemplaza todo el árbol, no solo el contenido de una ruta.
 * Deliberadamente sin depender de clases/tokens del theme del sitio
 * (Tailwind, fuentes) por si el fallo raíz está relacionado justamente
 * con la carga de esos recursos.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error.tsx]', error)
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b0b0f',
          color: '#f5f5f5',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Algo salió mal</h1>
          <p style={{ marginBottom: '1.5rem', opacity: 0.7 }}>
            El sitio tuvo un error inesperado. Probá recargar la página.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#f5f5f5',
              color: '#0b0b0f',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
