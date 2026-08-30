'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EntityType } from '@/types'

/**
 * Enlaces siempre visibles en la barra: la categoría núcleo del sitio
 * (Vehículos) más las secciones transversales que no son un tipo de
 * entidad (Comparar, Galería, Mapa).
 *
 * Noticias y Guías (EntityType.NEWS / EntityType.GUIDE) tienen rutas,
 * tipos y SEO ya construidos, pero 0 contenido real en
 * src/content/ (ver auditoría "AutoFicha: aprovechamiento de datos",
 * oportunidad P1 "Noticias/Guías"). Se retiran del nav por ahora para no
 * llevar a secciones vacías — decisión reversible, no se borra ninguna
 * ruta ni componente: alcanza con reagregar estas dos líneas cuando haya
 * contenido real que publicar.
 */
const NAV_LINKS = [
  { href: `/${EntityType.VEHICLE}`, label: 'Vehículos' },
  { href: '/comparar', label: 'Comparar' },
  { href: '/galeria', label: 'Galería' },
  { href: '/mapa', label: 'Mapa' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  // La home es un viewport pineado a 100dvh: si el header queda `sticky`
  // (como en el resto del sitio) le resta esos ~64-72px al panel, y el
  // panel deja de ocupar la pantalla completa. Acá pasa a `fixed`
  // (fuera del flujo, no reserva alto) y flota traslúcido/claro sobre el
  // fondo blanco de la home en vez del glass oscuro del resto del sitio.
  const isHome = pathname === '/'

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

  const iconBtnClass = isHome
    ? 'flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 transition-all hover:border-neutral-900 hover:text-neutral-900 focus-visible:border-neutral-900 focus-visible:text-neutral-900'
    : 'flex h-9 w-9 items-center justify-center rounded-lg border border-auto-border text-auto-text-secondary transition-all hover:border-auto-accent hover:text-auto-accent-strong hover:shadow-glow-pink focus-visible:border-auto-accent focus-visible:text-auto-accent'

  return (
    <header
      className={
        isHome
          ? // `fixed` (no `sticky`): fuera del flujo del documento, no le
            // resta alto al panel pineado de 100dvh de abajo. `env(safe-area-inset-top)`
            // lo empuja debajo del notch/isla dinámica en vez de quedar tapado.
            'fixed inset-x-0 top-0 z-50 w-full border-b border-neutral-200/70 bg-white/75 backdrop-blur-md'
          : 'glass-surface sticky top-0 z-50 w-full border-b border-auto-border/80 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]'
      }
      style={isHome ? { paddingTop: 'env(safe-area-inset-top)' } : undefined}
    >
      {!isHome && <div className="section-divider absolute inset-x-0 bottom-0" aria-hidden="true" />}
      <div className="mx-auto flex max-w-[96rem] items-center justify-between px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div
            className={
              isHome
                ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900'
                : 'logo-mark flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-auto-accent to-auto-accent-orange shadow-glow-pink'
            }
          >
            <span className={`font-display text-xs font-bold tracking-tight ${isHome ? 'text-white' : 'text-auto-darker'}`}>
              A
            </span>
          </div>
          {isHome ? (
            <span className="hidden font-display text-base font-semibold tracking-tight text-neutral-900 transition-colors duration-300 group-hover:text-neutral-600 sm:inline">
              Auto<span className="text-orange-600">Ficha</span>
            </span>
          ) : (
            <span className="hidden font-display text-base font-semibold tracking-tight text-auto-text transition-colors duration-300 group-hover:text-auto-accent-strong sm:inline">
              Auto<span className="text-gradient-vice">Ficha</span>
            </span>
          )}
        </Link>

        {/* Navegación principal (desktop) */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isHome
                  ? 'text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:text-neutral-900'
                  : 'link-underline text-sm font-medium text-auto-text-secondary transition-colors hover:text-auto-accent-strong focus-visible:text-auto-accent-strong'
              }
            >
              {link.label}
            </Link>
          ))}
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

          <Link href="/favoritos" aria-label="Favoritos" className={iconBtnClass}>
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
          </Link>

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
        hidden={!menuOpen}
        className={
          isHome
            ? 'border-t border-neutral-200/70 bg-white/95 px-4 py-3 backdrop-blur-md md:hidden'
            : 'glass-surface border-t border-auto-border px-4 py-3 md:hidden'
        }
      >
        <ul className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={
                  isHome
                    ? 'block rounded-md px-2 py-3 text-base font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:bg-neutral-100 focus-visible:text-neutral-900'
                    : 'block rounded-md px-2 py-3 text-base font-medium text-auto-text-secondary transition-colors hover:bg-auto-surface-elevated hover:text-auto-accent-strong focus-visible:bg-auto-surface-elevated focus-visible:text-auto-accent'
                }
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
