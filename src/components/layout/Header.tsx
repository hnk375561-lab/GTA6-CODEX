'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EntityType } from '@/types'
import { SITE_NAME } from '@/config/site'
import { cn } from '@/lib/utils'
import { useWishlist } from '@/lib/hooks/useWishlist'

/**
 * Enlaces siempre visibles en la barra: la categoría núcleo del sitio
 * (Vehículos) más las secciones transversales que no son un tipo de
 * entidad (Comparar, Galería, Mapa).
 *
 * Guías (EntityType.GUIDE) se reincorpora al nav (monetización, sept
 * 2026): la nota anterior decía "0 contenido real" pero
 * src/content/guias/ ya tiene 10 guías publicadas, 9 de ellas con tags
 * que disparan el CTA de afiliado de seguro/financiación
 * (MonetizationCtaGroup, ver page.tsx de [entityType]/[slug]). Tenerlas
 * fuera del nav significaba contenido con monetización ya cableada sin
 * ningún link interno que lo lleve tráfico — el peor tipo de desperdicio
 * (trabajo hecho, cero exposición). Noticias queda afuera todavía: solo
 * 3 artículos, umbral más bajo para justificar su propio ítem de nav.
 */
const NAV_LINKS = [
  { href: `/${EntityType.VEHICLE}`, label: 'Vehículos' },
  { href: `/${EntityType.MANUFACTURER}`, label: 'Fabricantes' },
  { href: `/${EntityType.GUIDE}`, label: 'Guías' },
  { href: '/comparar', label: 'Comparar' },
  { href: '/galeria', label: 'Galería' },
  { href: '/mapa', label: 'Mapa' },
]

// Nombre de marca partido en dos para poder colorear la segunda palabra
// en el logo (ver Footer.tsx, mismo criterio: nada de "AutoFicha"/"Sin
// Frenos" hardcodeado suelto — todo deriva de SITE_NAME en config/site.ts
// para que un rebrand futuro sea un cambio en un solo lugar, no un grep
// por el código como pasó con este mismo componente en el pivote
// AutoFicha -> Sin Frenos).
const [SITE_NAME_FIRST_WORD, ...SITE_NAME_REST_WORDS] = SITE_NAME.split(' ')
const SITE_NAME_REST = SITE_NAME_REST_WORDS.join(' ')

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  // Contador de favoritos en vivo (sincronización visual, ver
  // `useWishlist`): antes el corazón del header era un link ciego a
  // `/favoritos` sin ningún indicio de cuántos había guardados — el
  // hook ya se sincroniza solo entre toda instancia montada (evento
  // custom local + `storage` entre pestañas), así que este contador
  // queda al día apenas se toca un corazón en cualquier card del sitio,
  // sin recargar la página ni pasar el estado por props.
  const { count: wishlistCount, hydrated: wishlistHydrated } = useWishlist()
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
    ? 'tap-scale flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900 focus-visible:border-neutral-900 focus-visible:text-neutral-900'
    : 'tap-scale flex h-9 w-9 items-center justify-center rounded-lg border border-edge text-neutral-500 transition hover:border-auto-accent hover:text-auto-accent-strong focus-visible:border-auto-accent focus-visible:text-auto-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent'

  // Enlace activo: exacto o sub-ruta (ej. `/vehiculos` queda activo en
  // `/vehiculos/toyota-corolla`) — el único link sin sub-rutas propias es
  // la home, y esta barra nunca lista `/` como item, así que no hace
  // falta excluirla a mano.
  const isLinkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header
      className={
        isHome
          ? // `fixed` (no `sticky`): fuera del flujo del documento, no le
            // resta alto al panel pineado de 100dvh de abajo. `env(safe-area-inset-top)`
            // lo empuja debajo del notch/isla dinámica en vez de quedar tapado.
            'fixed inset-x-0 top-0 z-50 w-full border-b border-neutral-200/70 bg-white/75 backdrop-blur-md'
          : 'glass-surface sticky top-0 z-50 w-full border-b border-edge/80 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]'
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
                : 'logo-mark flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-auto-accent to-auto-accent-orange'
            }
          >
            <span className={`font-display text-xs font-bold tracking-tight ${isHome ? 'text-white' : 'text-auto-darker'}`}>
              {SITE_NAME.charAt(0)}
            </span>
          </div>
          {isHome ? (
            <span className="hidden font-display text-base font-semibold tracking-tight text-neutral-900 transition-colors duration-300 group-hover:text-neutral-600 sm:inline">
              {SITE_NAME_FIRST_WORD} <span className="text-orange-600">{SITE_NAME_REST}</span>
            </span>
          ) : (
            <span className="hidden font-display text-base font-semibold tracking-tight text-neutral-900 transition-colors duration-300 group-hover:text-auto-accent-strong sm:inline">
              {SITE_NAME_FIRST_WORD} <span className="text-gradient-vice">{SITE_NAME_REST}</span>
            </span>
          )}
        </Link>

        {/* Navegación principal (desktop) */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'link-underline text-sm font-medium transition-colors',
                  active && 'link-underline--active',
                  isHome
                    ? active
                      ? 'text-neutral-900'
                      : 'text-neutral-600 hover:text-neutral-900 focus-visible:text-neutral-900'
                    : active
                      ? 'text-auto-accent-strong'
                      : 'text-neutral-500 hover:text-auto-accent-strong focus-visible:text-auto-accent-strong'
                )}
              >
                {link.label}
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
                className="header-badge-pop absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-auto-accent px-1 font-mono text-[10px] font-semibold leading-none text-white"
              >
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
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

      {/* Navegación móvil — transición de altura (grid-rows 0fr→1fr) en vez
          del toggle abrupto por atributo `hidden` que tenía antes; el
          contenido sigue montado siempre (mejor para el timing de la
          transición) pero `inert` lo saca del tab order y de lectores de
          pantalla mientras está cerrado, sin depender de JS extra para
          eso. */}
      <nav
        id="mobile-nav"
        aria-label="Navegación móvil"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-[var(--ease-standard)] md:hidden',
          menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          isHome
            ? 'border-t border-neutral-200/70 bg-white/95 backdrop-blur-md'
            : 'glass-surface border-t border-edge'
        )}
      >
        <ul className="flex flex-col overflow-hidden px-4 py-3">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href)
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block rounded-md px-2 py-3 text-base font-medium transition-colors',
                    isHome
                      ? active
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:bg-neutral-100 focus-visible:text-neutral-900'
                      : active
                        ? 'bg-surface-alt text-auto-accent-strong'
                        : 'text-neutral-500 hover:bg-surface-alt hover:text-auto-accent-strong focus-visible:bg-surface-alt focus-visible:text-auto-accent'
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
