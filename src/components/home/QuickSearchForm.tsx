'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SITE_NAME } from '@/config/site'
import { prefersReducedMotion } from '@/lib/utils'

/**
 * Fallback si no se pasa `examples` — un puñado de títulos reales del
 * catálogo (no inventados: existen hoy como fichas en
 * `src/content/vehiculos/`), para que el componente tenga sentido incluso
 * si algún caller no le pasa la lista real. El caller principal
 * (`src/app/page.tsx`) sí pasa una muestra real y variada del catálogo
 * completo — ver ese archivo.
 */
const DEFAULT_EXAMPLES = ['Toyota Corolla', 'BMW X5', 'Honda CBR600RR', 'Audi A4', 'Hyundai Tucson']

const EXAMPLE_ROTATE_MS = 3200

interface QuickSearchFormProps {
  /** Títulos reales del catálogo para rotar en el placeholder ("Ej. X…").
   *  Default: `DEFAULT_EXAMPLES` si no se pasa nada. */
  examples?: string[]
}

/**
 * Barra de búsqueda compacta para la home. No reimplementa el buscador
 * real (Fuse.js vive en `SearchClient`, que necesita las ~500 entidades
 * en memoria): solo captura el texto y navega a `/buscar?q=...`, que ahora
 * lee ese query param server-side (ver `/buscar/page.tsx`) y lo usa como
 * estado inicial de `SearchClient` — deep-linking real, no un input de
 * juguete que aterriza en una página de búsqueda vacía.
 *
 * Progressive enhancement: antes el `<form>` no tenía `action`/`method`
 * ni el input un `name`, así que dependía 100% de `onSubmit` — con JS
 * caído (falla de carga del bundle, extensión que lo bloquea, etc.) el
 * submit no hacía nada. Ahora `action="/buscar" method="get"` + `name="q"`
 * hacen que el navegador arme la misma URL (`/buscar?q=...`) por su
 * cuenta si `handleSubmit` nunca llega a correr; `preventDefault()` sigue
 * interceptando el caso normal (JS activo) para navegar con el router de
 * Next en vez de una recarga completa.
 *
 * Placeholder rotativo (5.B, prioridad B): antes el placeholder era un
 * único ejemplo fijo ("Ej. Toyota Corolla, BMW GS 310…", uno de los dos
 * ni siquiera existe hoy en el catálogo). Ahora rota entre `examples`
 * (títulos reales, ver arriba) cada `EXAMPLE_ROTATE_MS` — mismo criterio
 * de intervalo/`prefers-reduced-motion` que ya usan `RotatingHeroBackground`
 * y `WordRotate` en el resto del sitio, y se pausa mientras el usuario ya
 * escribió algo (el placeholder queda oculto de todas formas, rotar atrás
 * de un valor visible no aporta nada, solo trabajo de más).
 */
export function QuickSearchForm({ examples = DEFAULT_EXAMPLES }: QuickSearchFormProps) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [exampleIndex, setExampleIndex] = useState(0)

  useEffect(() => {
    setReducedMotion(prefersReducedMotion())
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion || value.length > 0 || examples.length <= 1) return
    const id = setInterval(() => {
      setExampleIndex((i) => (i + 1) % examples.length)
    }, EXAMPLE_ROTATE_MS)
    return () => clearInterval(id)
  }, [reducedMotion, value.length, examples])

  const activeExample = examples[exampleIndex % examples.length] ?? examples[0]
  const placeholder = activeExample ? `Ej. ${activeExample}…` : undefined

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    router.push(trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : '/buscar')
  }

  // Atajo "/" para enfocar la búsqueda sin tocar el mouse, mismo patrón
  // que sitios de referencia (GitHub, Notion, etc.). Se ignora si el foco
  // ya está en un campo de texto/textarea/contentEditable, para no robar
  // el "/" a quien lo esté escribiendo en otro input de la página.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if (isEditable) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <form
      onSubmit={handleSubmit}
      action="/buscar"
      method="get"
      className="relative mx-auto w-full max-w-xl"
      role="search"
    >
      <svg
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={`Búsqueda rápida en ${SITE_NAME}. Atajo: tecla oblicua`}
        className="w-full rounded-xl border border-neutral-200 bg-white py-3.5 pl-11 pr-24 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 transition focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 sm:text-base"
      />
      {/* Indicador del atajo de teclado: se oculta solo mientras el input
          tiene contenido o foco (empty-values / has-[:focus]), y en mobile
          (donde no hay teclado físico) vía sm:flex. No compite con el
          botón "Buscar" porque ambos ocupan el mismo hueco a la derecha
          en momentos distintos. */}
      <kbd
        aria-hidden="true"
        className="hero-search-kbd-hint pointer-events-none absolute right-20 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-neutral-200 px-1.5 py-1 font-mono text-xs text-neutral-400 sm:flex"
      >
        /
      </kbd>
      <button
        type="submit"
        className="hero-search-submit absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-auto-accent px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-auto-accent-strong sm:text-sm"
      >
        Buscar
      </button>
    </form>
  )
}
