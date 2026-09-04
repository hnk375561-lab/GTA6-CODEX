import type { HeroQuickLinkItem } from '@/components/home/HeroQuickLinks'

/**
 * Ítems del cluster "constelación de accesos directos" del hero — ver
 * `HeroQuickLinks.tsx`. Reemplaza los 2 links de texto que antes vivían
 * debajo del buscador (`/vehiculos`, `/comparar`) por 10 chips al mismo
 * nivel visual, cubriendo las secciones reales del sitio (`src/app/*`)
 * para que el hero funcione también como mapa de navegación rápida —
 * suma links internos profundos desde la home (bonus de descubrimiento
 * para SEO, no solo estético).
 *
 * `size` fija la jerarquía sutil de tamaño (no de interactividad — las
 * 10 son igual de clickeables): `lg` para las 2 acciones de mayor
 * intención real (catálogo completo, comparador), `md` para las
 * secciones de contenido/exploración, `sm` para las de negocio local
 * (financiamiento, venta, concesionarias) que son de nicho más
 * específico.
 *
 * Íconos: SVG a mano (24×24, stroke 2, cabos/uniones redondeadas) — el
 * repo no tiene una librería de íconos instalada, se mantiene el mismo
 * criterio que el resto del sitio (ver sellos de evidencia y chips de
 * specs en `HeroVehicleShowcaseV2.tsx`).
 */
export const HERO_QUICK_LINKS: HeroQuickLinkItem[] = [
  {
    href: '/vehiculos',
    label: 'Catálogo completo',
    size: 'lg',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" />
        <path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z" />
        <circle cx="7.5" cy="17" r="1.5" />
        <circle cx="16.5" cy="17" r="1.5" />
      </svg>
    ),
  },
  {
    href: '/comparar',
    label: 'Comparar autos',
    size: 'lg',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3v14a2 2 0 0 0 2 2h4" />
        <path d="M3 8h6" />
        <path d="M18 3v14a2 2 0 0 1-2 2h-4" />
        <path d="M15 8h6" />
      </svg>
    ),
  },
  {
    href: '/categorias',
    label: 'Categorías',
    size: 'md',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/fabricantes',
    label: 'Fabricantes',
    size: 'md',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21V10l6-4v15" />
        <path d="M15 21V6l6 4v11" />
        <path d="M9 21V13h6v8" />
      </svg>
    ),
  },
  {
    href: '/rankings',
    label: 'Rankings',
    size: 'md',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
        <path d="M7 6H4a3 3 0 0 0 3 5" />
        <path d="M17 6h3a3 3 0 0 1-3 5" />
      </svg>
    ),
  },
  {
    href: '/guias',
    label: 'Guías',
    size: 'md',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
        <path d="M4 5.5V20.5" />
      </svg>
    ),
  },
  {
    href: '/noticias',
    label: 'Noticias',
    size: 'md',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <path d="M7 8h6" />
        <path d="M7 12h10" />
        <path d="M7 16h10" />
      </svg>
    ),
  },
  {
    href: '/financiamiento',
    label: 'Financiamiento',
    size: 'sm',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 15h4" />
      </svg>
    ),
  },
  {
    href: '/vender-tu-auto',
    label: 'Vendé tu auto',
    size: 'sm',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.5 12.5 12 21l-9-9V4h8z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </svg>
    ),
  },
  {
    href: '/concesionarias-concepcion-del-uruguay',
    label: 'Concesionarias CdU',
    size: 'sm',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
]
