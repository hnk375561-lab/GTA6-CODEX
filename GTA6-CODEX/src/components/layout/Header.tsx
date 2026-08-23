'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EntityType } from '@/types'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { ENTITY_TYPE_LABELS } from '@/lib/entity-labels'
import { cn } from '@/lib/utils'

/**
 * Enlaces siempre visibles en la barra: las 5 categorías "núcleo" del
 * expediente (quiénes, dónde, con qué se mueven, misiones, material
 * oficial — mismo criterio editorial que ya define `CATEGORY_ORDER` en
 * `app/page.tsx`) más las dos secciones transversales que no son un tipo
 * de entidad (Comparar, Galería).
 */
const NAV_LINKS = [
  { href: `/${EntityType.CHARACTER}`, label: 'Personajes' },
  { href: `/${EntityType.LOCATION}`, label: 'Ubicaciones' },
  { href: `/${EntityType.VEHICLE}`, label: 'Vehículos' },
  { href: `/${EntityType.MISSION}`, label: 'Misiones' },
  { href: `/${EntityType.TRAILER}`, label: 'Trailers' },
  { href: '/comparar', label: 'Comparar' },
  { href: '/galeria', label: 'Galería' },
  { href: '/mapa', label: 'Mapa' },
]

/**
 * "El resto" de las categorías (armas, actividades, organizaciones,
 * negocios, objetos, noticias, guías) — exactamente el mismo grupo y
 * orden que el comentario de `CATEGORY_ORDER` en `app/page.tsx` ya
 * describía como "el resto... en el mismo orden que ya usa el menú de
 * navegación", solo que el menú nunca había llegado a reflejarlo (ver
 * punto 2.4 del análisis). Hasta ahora, estas 5 primeras solo eran
 * alcanzables por búsqueda o por relación cruzada desde otra ficha.
 * Viven en el dropdown "Más categorías" en vez de sumarse en línea a
 * `NAV_LINKS` para no volver ilegible la barra en desktop.
 */
const NAV_MORE: Array<{ type: EntityType; href: string }> = [
  { type: EntityType.WEAPON, href: `/${EntityType.WEAPON}` },
  { type: EntityType.ACTIVITY, href: `/${EntityType.ACTIVITY}` },
  { type: EntityType.FACTION, href: `/${EntityType.FACTION}` },
  { type: EntityType.BUSINESS, href: `/${EntityType.BUSINESS}` },
  { type: EntityType.OBJECT, href: `/${EntityType.OBJECT}` },
  { type: EntityType.NEWS, href: `/${EntityType.NEWS}` },
  { type: EntityType.GUIDE, href: `/${EntityType.GUIDE}` },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const isMoreActive = NAV_MORE.some((item) => pathname?.startsWith(item.href))

  // Cierra ambos menús al navegar y al presionar Escape.
  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen && !moreOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setMoreOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen, moreOpen])

  // Cierra el dropdown "Más categorías" al clickear fuera de él.
  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [moreOpen])

  return (
    <header className="glass-surface sticky top-0 z-50 w-full border-b border-gta-border/80 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="section-divider absolute inset-x-0 bottom-0" aria-hidden="true" />
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="logo-mark flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gta-accent to-gta-accent-orange shadow-glow-pink">
            <span className="font-display text-xs font-bold tracking-tight text-gta-darker">A</span>
          </div>
          <span className="hidden font-display text-base font-semibold tracking-tight text-gta-text transition-colors duration-300 group-hover:text-gta-accent-strong sm:inline">
            Auto<span className="text-gradient-vice">Ficha</span>
          </span>
        </Link>

        {/* Navegación principal (desktop) */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="link-underline text-sm font-medium text-gta-text-secondary transition-colors hover:text-gta-accent-strong focus-visible:text-gta-accent-strong"
            >
              {link.label}
            </Link>
          ))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              aria-controls="nav-more-panel"
              className={cn(
                'flex items-center gap-1 text-sm font-medium transition-colors focus-visible:text-gta-accent-strong',
                isMoreActive ? 'text-gta-accent-strong' : 'text-gta-text-secondary hover:text-gta-accent-strong'
              )}
            >
              Más categorías
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={cn('transition-transform duration-200', moreOpen && 'rotate-180')}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {moreOpen && (
              <div
                id="nav-more-panel"
                role="menu"
                aria-label="Más categorías"
                className="glass-surface absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-gta-border p-1.5 shadow-gta-xl"
              >
                <ul className="flex flex-col gap-0.5">
                  {NAV_MORE.map((item) => (
                    <li key={item.href} role="none">
                      <Link
                        href={item.href}
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gta-text-secondary transition-colors hover:bg-gta-surface-elevated hover:text-gta-accent-strong"
                      >
                        <CategoryIcon type={item.type} className="h-4 w-4 shrink-0 text-gta-accent" />
                        {ENTITY_TYPE_LABELS[item.type]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </nav>

        {/* Búsqueda y menú móvil */}
        <div className="flex items-center gap-2">
          <Link
            href="/buscar"
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gta-border text-gta-text-secondary transition-all hover:border-gta-accent hover:text-gta-accent-strong hover:shadow-glow-pink focus-visible:border-gta-accent focus-visible:text-gta-accent"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gta-border text-gta-text-secondary transition-all hover:border-gta-accent hover:text-gta-accent-strong hover:shadow-glow-pink focus-visible:border-gta-accent focus-visible:text-gta-accent md:hidden"
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
        className="glass-surface border-t border-gta-border px-4 py-3 md:hidden"
      >
        <ul className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-md px-2 py-3 text-base font-medium text-gta-text-secondary transition-colors hover:bg-gta-surface-elevated hover:text-gta-accent-strong focus-visible:bg-gta-surface-elevated focus-visible:text-gta-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="my-2 h-px bg-gta-border" aria-hidden="true" />
        <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-gta-text-tertiary">
          Más categorías
        </p>
        <ul className="flex flex-col">
          {NAV_MORE.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-2.5 rounded-md px-2 py-3 text-base font-medium text-gta-text-secondary transition-colors hover:bg-gta-surface-elevated hover:text-gta-accent-strong focus-visible:bg-gta-surface-elevated focus-visible:text-gta-accent"
              >
                <CategoryIcon type={item.type} className="h-4 w-4 shrink-0 text-gta-accent" />
                {ENTITY_TYPE_LABELS[item.type]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
