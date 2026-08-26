'use client'

import { useWishlist } from '@/lib/hooks/useWishlist'
import { cn } from '@/lib/utils'

interface WishlistButtonProps {
  type: string
  slug: string
  title: string
  /** 'card' = botón chico circular, pensado para superponerse a una
   *  EntityCard (mismo lenguaje visual que el checkbox de comparación).
   *  'inline' = versión con label de texto, para la ficha completa de la
   *  entidad o cualquier lugar con más espacio. */
  variant?: 'card' | 'inline'
  className?: string
}

/** Ícono de corazón, mismo lenguaje lineal (stroke 2, sin relleno salvo
 *  estado activo) que los `MiniIcon` de EntityCard/CategoryIcon. */
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5s-7.5-4.6-10-9.2C.5 8 1.8 4.5 5 3.4c2.2-.8 4.4.1 5.6 2 .3.5.4.7.4.7s.1-.2.4-.7c1.2-1.9 3.4-2.8 5.6-2 3.2 1.1 4.5 4.6 3 7.9-2.5 4.6-10 9.2-10 9.2Z" />
    </svg>
  )
}

/**
 * Toggle de favoritos, persistido en `localStorage` vía `useWishlist`
 * (no hay cuentas de usuario en el sitio — ver el comentario largo en ese
 * hook). Mismo truco de hitbox 44x44 sobre un ícono chico que ya usa
 * `CompareCheckbox` en `EntityCard.tsx`, y mismo `stopPropagation` para
 * poder vivir dentro de una card cuyo contenedor entero es un `<Link>`.
 */
export function WishlistButton({ type, slug, title, variant = 'card', className }: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist, hydrated } = useWishlist()
  const active = hydrated && isWishlisted(type, slug)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(type, slug)
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
          active
            ? 'border-auto-accent bg-auto-accent/10 text-auto-accent-strong'
            : 'border-auto-border text-auto-text-secondary hover:border-auto-accent hover:text-auto-accent-strong',
          className
        )}
      >
        <HeartIcon filled={active} />
        {active ? 'En favoritos' : 'Agregar a favoritos'}
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Quitar ${title} de favoritos` : `Agregar ${title} a favoritos`}
      onClick={handleClick}
      className={cn(
        // Mismo patrón de hitbox invisible 44x44 que CompareCheckbox, para
        // no perder área táctil aunque el ícono visible siga siendo chico.
        'relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border backdrop-blur-sm transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[""] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent',
        active
          ? 'border-auto-accent bg-auto-accent text-white'
          : 'border-white/25 bg-black/40 text-white/80 hover:border-white/50',
        className
      )}
    >
      <HeartIcon filled={active} />
    </button>
  )
}
