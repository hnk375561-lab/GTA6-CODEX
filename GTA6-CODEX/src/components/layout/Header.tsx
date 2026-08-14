'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EntityType } from '@/types'

const NAV_LINKS = [
  { href: `/${EntityType.CHARACTER}`, label: 'Personajes' },
  { href: `/${EntityType.VEHICLE}`, label: 'Vehículos' },
  { href: `/${EntityType.LOCATION}`, label: 'Ubicaciones' },
  { href: `/${EntityType.MISSION}`, label: 'Misiones' },
  { href: `/${EntityType.NEWS}`, label: 'Noticias' },
  { href: `/${EntityType.GUIDE}`, label: 'Guías' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // Cierra el menú móvil al navegar y al presionar Escape.
  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gta-border bg-gta-dark/95 backdrop-blur supports-[backdrop-filter]:bg-gta-dark/60">
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

        {/* Navegación principal (desktop) */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="link-underline text-sm text-gta-text-secondary transition-colors hover:text-gta-accent focus-visible:text-gta-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Búsqueda y menú móvil */}
        <div className="flex items-center gap-2">
          <Link
            href="/buscar"
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gta-border text-gta-text-secondary transition-colors hover:border-gta-accent hover:text-gta-accent focus-visible:border-gta-accent focus-visible:text-gta-accent"
          >
            <svg
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
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gta-border text-gta-text-secondary transition-colors hover:border-gta-accent hover:text-gta-accent focus-visible:border-gta-accent focus-visible:text-gta-accent md:hidden"
          >
            <svg
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
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Navegación móvil */}
      <nav
        id="mobile-nav"
        aria-label="Navegación móvil"
        hidden={!menuOpen}
        className="border-t border-gta-border bg-gta-dark px-4 py-3 md:hidden"
      >
        <ul className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-md px-2 py-3 text-base text-gta-text-secondary transition-colors hover:bg-gta-surface hover:text-gta-accent focus-visible:bg-gta-surface focus-visible:text-gta-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
