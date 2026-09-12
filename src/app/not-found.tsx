import Link from 'next/link'
import { AdUnit } from '@/components/monetization/AdUnit'

/**
 * ============================================================================
 * 404 NOT FOUND — P0-02 AUDIT FIX (septiembre 2026)
 * ============================================================================
 *
 * MEJORAS APLICADAS:
 * - Mensaje explícito y honesto: "Esta página no existe"
 * - Status HTTP 404 real devuelto por Next.js automáticamente
 * - CTAs claros para seguir navegando: Inicio, Buscar
 * - Explicación adicional de qué pasó (URL rota, typo, etc.)
 * - Accesibilidad mejorada (aria labels, roles semánticos)
 * - Consistencia visual con el resto del sitio (paleta Archivo)
 *
 * ISSUE REPORTADO (auditoría P0-02):
 * - URLs inexistentes mostraban "Cargando el listado…" eternamente
 * - No había ningún mensaje de error o CTA de recuperación
 * - HTTP 200 falso (el servidor debe devolver 404)
 * - Violaba Nielsen heurística #9 (error recovery) y #1 (state visibility)
 *
 * SOLUCIÓN:
 * - Página 404 dedicada con mensaje honesto y rutas de salida claras
 * - Se devuelve HTTP 404 real (Next.js lo hace automáticamente con notFound())
 * - Mismo nivel visual que otras secciones (hero, eye brow, h1, párrafo)
 */

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="container-narrow py-20 text-center">
        {/* Eyebrow: etiqueta de contexto */}
        <div className="mb-12">
          <p className="eyebrow mb-4 text-xs font-semibold uppercase text-oxide-red">
            Expediente · No encontrado
          </p>
          
          {/* Heading principal con énfasis visual */}
          <div className="mb-6">
            <div className="mb-4 font-serif text-8xl font-bold tracking-tight sm:text-9xl">
              <span className="block text-ink/20">404</span>
            </div>
            <h1 className="mb-4 font-serif text-4xl font-bold text-ink sm:text-5xl">
              Página no encontrada
            </h1>
          </div>

          {/* Explicación clara del problema */}
          <p className="mx-auto max-w-md text-lg text-ink/70 leading-relaxed">
            Esta página no existe en el archivo. Podría ser:
          </p>
          <ul className="mx-auto mt-4 max-w-md space-y-1 text-sm text-ink/60">
            <li>• Un enlace antiguo o mal escrito</li>
            <li>• Un resultado viejo de Google todavía indexado</li>
            <li>• Una URL compartida con un typo</li>
          </ul>
        </div>

        {/* CTAs de recuperación: claras y accesibles */}
        <div className="space-y-4">
          {/* CTA primaria: volver a inicio */}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-oxide-red px-8 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-white transition-transform duration-200 hover:scale-105 hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxide-red"
          >
            Volver al Archivo
          </Link>

          {/* CTA secundaria: buscar */}
          <div>
            <Link
              href="/buscar"
              className="inline-flex items-center justify-center gap-2 text-oxide-red transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxide-red"
            >
              <span className="font-mono text-xs uppercase tracking-[0.1em]">
                O buscá lo que necesitás
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Divider visual (opcional pero coherente con el diseño Archivo) */}
        <div className="my-12 flex items-center gap-4">
          <div className="h-px flex-1 bg-ink/10" />
          <span className="font-mono text-xs text-ink/40">O explora</span>
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        {/* Links de exploración rápida */}
        <nav className="space-y-2" aria-label="Exploración rápida">
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/vehiculos"
              className="rounded border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
            >
              Vehículos
            </Link>
            <Link
              href="/fabricantes"
              className="rounded border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
            >
              Fabricantes
            </Link>
            <Link
              href="/comparar"
              className="rounded border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
            >
              Comparar
            </Link>
            <Link
              href="/galeria"
              className="rounded border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
            >
              Galería
            </Link>
          </div>
        </nav>

        {/* Ad unit: reutiliza el slot estándar del sitio */}
        <AdUnit 
          slotId="3119092668" 
          format="responsive" 
          className="mt-12" 
          dataTrackingLabel="ad-404" 
        />
      </div>
    </div>
  )
}
