'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EntityType } from '@/types'
import { SITE_NAME } from '@/config/site'
import { cn } from '@/lib/utils'
import { useWishlist } from '@/lib/hooks/useWishlist'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

/**
 * Enlaces siempre visibles en la barra: la categoría núcleo del sitio
 * (Vehículos) más las secciones transversales que no son un tipo de
 * entidad (Comparar, Galería, Mapa).
 */
const NAV_LINKS = [
  { href: `/${EntityType.VEHICLE}`, label: 'Vehículos' },
  { href: `/${EntityType.MANUFACTURER}`, label: 'Fabricantes' },
  { href: `/${EntityType.GUIDE}`, label: 'Guías' },
  { href: `/${EntityType.NEWS}`, label: 'Noticias' },
  { href: '/comparar', label: 'Comparar' },
  { href: '/galeria', label: 'Galería' },
  { href: '/mapa', label: 'Mapa' },
]

// Nombre de marca partido en dos para poder colorear la segunda palabra
const [SITE_NAME_FIRST_WORD, ...SITE_NAME_REST_WORDS] = SITE_NAME.split(' ')
const SITE_NAME_REST = SITE_NAME_REST_WORDS.join(' ')

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const [prevPathname, setPrevPathname] = useState(pathname)
  const { count: wishlistCount, hydrated: wishlistHydrated } = useWishlist()

  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setMenuOpen(false)
  }

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

  // Puramente visual: separa el header del contenido con una sombra
  // sutil apenas hay scroll, para que no "flote" indistinguible sobre
  // el papel cuando ambos comparten el mismo tono de fondo.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const iconBtnClass = 'tap-scale relative flex h-9 w-9 items-center justify-center rounded border border-ink/20 text-ink/60 transition hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink before:absolute before:-inset-1 before:rounded-lg before:content-[\'\']'

  const isLinkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-paper/95 backdrop-blur-sm transition-shadow duration-300',
        scrolled ? 'border-border shadow-sm' : 'border-border/0'
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-[96rem] items-center justify-between px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-oxide-red bg-oxide-red/5">
            <span className="font-serif text-xs font-bold tracking-tight text-oxide-red">
              {SITE_NAME.charAt(0)}
            </span>
          </div>
          <span className="hidden font-serif text-base font-semibold tracking-tight text-ink transition-colors duration-300 group-hover:text-oxide-red sm:inline">
            {SITE_NAME_FIRST_WORD} <span className="text-oxide-red">{SITE_NAME_REST}</span>
          </span>
        </Link>

        {/* Navegación principal (desktop) */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative font-mono text-xs uppercase tracking-[0.15em] transition-colors',
                  active
                    ? 'text-oxide-red'
                    : 'text-ink/60 hover:text-ink'
                )}
              >
                {link.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-oxide-red"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Búsqueda y menú móvil */}
        <div className="flex items-center gap-2">
          <Link href="/buscar" aria-label="Buscar" className={iconBtnClass}>
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

          <Link href="/favoritos" aria-label={`Favoritos${wishlistHydrated && wishlistCount > 0 ? ` (${wishlistCount})` : ''}`} className={cn(iconBtnClass, 'relative')}>
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
              <path d="M12 20.5s-7.5-4.6-10-9.2C.5 8 1.8 4.5 5 3.4c2.2-.8 4.4.1 5.6 2 .3.5.4.7.4.7s.1-.2.4-.7c1.2-1.9 3.4-2.8 5.6-2 3.2 1.1 4.5 4.6 3 7.9-2.5 4.6-10 9.2-10 9.2Z" />
            </svg>
            {wishlistHydrated && wishlistCount > 0 && (
              <span
                key={wishlistCount}
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-oxide-red px-1 font-mono text-[10px] font-semibold leading-none text-white"
              >
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </Link>

          <ThemeToggle className={iconBtnClass} />

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className={`${iconBtnClass} md:hidden`}
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
        aria-hidden={!menuOpen}
        className={cn(
          'border-t border-border bg-paper transition-all duration-300 md:hidden',
          menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        )}
      >
        <ul className="flex flex-col px-4 py-3">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href)
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block rounded-md px-2 py-3 font-mono text-xs uppercase tracking-[0.15em] transition-colors',
                    active
                      ? 'text-oxide-red'
                      : 'text-ink/60 hover:text-ink'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
