'use client'

import Link from 'next/link'
import { EntityType } from '@/types'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gta-border bg-gta-dark/95 backdrop-blur supports-[backdrop-filter]:bg-gta-dark/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center bg-gta-accent">
            <span className="text-xs font-bold text-gta-dark">GTA</span>
          </div>
          <span className="hidden font-bold text-gta-text sm:inline">GTA6 Codex</span>
        </Link>

        {/* Navegación principal */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href={`/${EntityType.CHARACTER}`}
            className="text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Personajes
          </Link>
          <Link
            href={`/${EntityType.VEHICLE}`}
            className="text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Vehículos
          </Link>
          <Link
            href={`/${EntityType.LOCATION}`}
            className="text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Ubicaciones
          </Link>
          <Link
            href={`/${EntityType.MISSION}`}
            className="text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Misiones
          </Link>
          <Link
            href={`/${EntityType.NEWS}`}
            className="text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
          >
            Noticias
          </Link>
        </nav>

        {/* Placeholder para futuras acciones */}
        <div className="flex items-center gap-2">
          {/* Search, theme toggle, etc. irán aquí */}
        </div>
      </div>
    </header>
  )
}
