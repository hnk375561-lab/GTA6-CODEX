'use client'

import Link from 'next/link'
import { EntityType } from '@/types'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full animate-slide-in border-b border-gta-border bg-gta-dark/95 backdrop-blur supports-[backdrop-filter]:bg-gta-dark/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="logo-mark flex h-8 w-8 items-center justify-center rounded-md bg-gta-accent">
            <span className="text-xs font-bold text-gta-dark">GTA</span>
          </div>
          <span className="hidden font-bold text-gta-text transition-colors duration-300 group-hover:text-gta-accent sm:inline">
            GTA6 Codex
          </span>
        </Link>

        {/* Navegación principal */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href={`/${EntityType.CHARACTER}`}
            className="link-underline text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Personajes
          </Link>
          <Link
            href={`/${EntityType.VEHICLE}`}
            className="link-underline text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Vehículos
          </Link>
          <Link
            href={`/${EntityType.LOCATION}`}
            className="link-underline text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Ubicaciones
          </Link>
          <Link
            href={`/${EntityType.MISSION}`}
            className="link-underline text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Misiones
          </Link>
          <Link
            href={`/${EntityType.NEWS}`}
            className="link-underline text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Noticias
          </Link>
        </nav>

        {/* Búsqueda y futuras acciones */}
        <div className="flex items-center gap-2">
          <Link
            href="/buscar"
            aria-label="Buscar"
            className="btn-pop flex h-9 w-9 items-center justify-center rounded-lg border border-gta-border text-gta-text-secondary transition-colors hover:border-gta-accent hover:text-gta-accent"
          >
            🔍
          </Link>
        </div>
      </div>
    </header>
  )
}
