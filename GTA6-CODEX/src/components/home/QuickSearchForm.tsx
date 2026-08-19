'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Barra de búsqueda compacta para la home. No reimplementa el buscador
 * real (Fuse.js vive en `SearchClient`, que necesita las ~500 entidades
 * en memoria): solo captura el texto y navega a `/buscar?q=...`, que ahora
 * lee ese query param server-side (ver `/buscar/page.tsx`) y lo usa como
 * estado inicial de `SearchClient` — deep-linking real, no un input de
 * juguete que aterriza en una página de búsqueda vacía.
 */
export function QuickSearchForm() {
  const router = useRouter()
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    router.push(trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : '/buscar')
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto w-full max-w-xl" role="search">
      <svg
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gta-text-tertiary"
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
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ej. Jason Duval, Vice City, Bati 801…"
        aria-label="Búsqueda rápida en GTA6 Zona"
        className="glass-surface w-full rounded-xl border border-gta-border py-3.5 pl-11 pr-24 text-sm text-gta-text placeholder:text-gta-text-tertiary transition-all focus:border-gta-accent focus:shadow-glow-pink focus:outline-none sm:text-base"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-gta-accent px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-gta-darker transition-colors hover:bg-gta-accent-strong sm:text-sm"
      >
        Buscar
      </button>
    </form>
  )
}
