'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EntityType } from '@/types'

/**
 * Enlaces siempre visibles en la barra: la categoría núcleo del sitio
 * (Vehículos) más las secciones transversales que no son un tipo de
 * entidad (Comparar, Galería, Mapa).
 */
const NAV_LINKS = [
  { href: `/${EntityType.VEHICLE}`, label: 'Vehículos' },
  { href: `/${EntityType.NEWS}`, label: 'Noticias' },
  { href: `/${EntityType.GUIDE}`, label: 'Guías' },
  { href: '/comparar', label: 'Comparar' },
  { href: '/galeria', label: 'Galería' },
  { href: '/mapa', label: 'Mapa' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // Cierra el menú móvil al navegar y al presionar Escape.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="glass-surface sticky top-0 z-50 w-full border-b border-auto-border/80 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="section-divider absolute inset-x-0 bottom-0" aria-hidden="true" />
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="logo-mark flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-auto-accent to-auto-accent-orange shadow-glow-pink">
            <span className="font-display text-xs font-bold tracking-tight text-auto-darker">A</span>
          </div>
          <span className="hidden font-display text-base font-semibold tracking-tight text-auto-text transition-colors duration-300 group-hover:text-auto-accent-strong sm:inline">
            Auto<span className="text-gradient-vice">Ficha</span>
          </span>
        </Link>

        {/* Navegación principal (desktop) */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="link-underline text-sm font-medium text-auto-text-secondary transition-colors hover:text-auto-accent-strong focus-visible:text-auto-accent-strong"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-auto-border text-auto-text-secondary transition-all hover:border-auto-accent hover:text-auto-accent-strong hover:shadow-glow-pink focus-visible:border-auto-accent focus-visible:text-auto-accent"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-auto-border text-auto-text-secondary transition-all hover:border-auto-accent hover:text-auto-accent-strong hover:shadow-glow-pink focus-visible:border-auto-accent focus-visible:text-auto-accent md:hidden"
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
        className="glass-surface border-t border-auto-border px-4 py-3 md:hidden"
      >
        <ul className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-md px-2 py-3 text-base font-medium text-auto-text-secondary transition-colors hover:bg-auto-surface-elevated hover:text-auto-accent-strong focus-visible:bg-auto-surface-elevated focus-visible:text-auto-accent"
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
