import Image from 'next/image'
import { Entity, EntityType } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { GridPattern } from '@/components/ui/GridPattern'
import { cn } from '@/lib/utils'

interface EntityImageProps {
  entity: Entity
  /**
   * Imagen ya resuelta por el caller de servidor (ver
   * `resolveEntityDisplayImage`/`getEntityImageMap` en `@/lib/media.ts`),
   * o `null` si la entidad no tiene ninguna. `undefined` se trata igual
   * que `null` (fallback CSS) — se acepta para no forzar a cada caller a
   * poner `?? null` explícito.
   *
   * Este componente se renderiza tanto desde Server Components como desde
   * dentro de árboles `'use client'` (`EntityCard`, `SearchClient`), y en
   * ese segundo caso Next.js lo empaqueta para el navegador. Por eso NO
   * puede resolver la imagen acá mismo con `fs` (como hacía antes): el
   * navegador no tiene `fs`, y esa llamada rompía con
   * "fs.existsSync is not a function". Resolver siempre aguas arriba, en
   * servidor, y pasar el resultado ya serializado como esta prop.
   */
  image?: ResolvedDisplayImage | null
  /**
   * 'thumbnail' → card de listado (más ancha que alta, sin prioridad de carga)
   * 'portrait'  → sidebar de la ficha individual (más alta, sin prioridad de carga)
   * 'avatar'    → miniatura cuadrada compacta (paneles de relaciones, timeline)
   * Ninguna variante usa `priority`: la primera pintura relevante del sitio
   * sigue siendo el hero animado de texto, no una foto de entidad.
   */
  variant?: 'thumbnail' | 'portrait' | 'avatar'
  className?: string
}

const ASPECT: Record<NonNullable<EntityImageProps['variant']>, string> = {
  thumbnail: 'aspect-[16/9]',
  portrait: 'aspect-[4/5]',
  avatar: 'aspect-square',
}

const SIZES: Record<NonNullable<EntityImageProps['variant']>, string> = {
  thumbnail: '(min-width: 1024px) 360px, (min-width: 640px) 45vw, 100vw',
  portrait: '320px',
  avatar: '56px',
}

/**
 * Silueta/glifo abstracto por categoría para el fallback. 100% geométrico,
 * generado con el mismo lenguaje visual que EntityHeaderBackground
 * (grid + acento de color), sin representar a ninguna entidad concreta.
 */
function CategoryGlyph({ type, size = 'default' }: { type: EntityType; size?: 'default' | 'sm' }) {
  const cls = size === 'sm' ? 'h-4 w-4 stroke-gta-accent/50' : 'h-10 w-10 stroke-gta-accent/50'
  switch (type) {
    case EntityType.CHARACTER:
      return (
        <svg viewBox="0 0 48 48" className={cls} fill="none" strokeWidth="1.5" aria-hidden="true">
          <circle cx="24" cy="17" r="8" />
          <path d="M8 40c2-9 9-14 16-14s14 5 16 14" />
        </svg>
      )
    case EntityType.VEHICLE:
      return (
        <svg viewBox="0 0 48 48" className={cls} fill="none" strokeWidth="1.5" aria-hidden="true">
          <path d="M6 30l4-11a4 4 0 0 1 4-3h20a4 4 0 0 1 4 3l4 11" />
          <rect x="4" y="30" width="40" height="9" rx="2" />
          <circle cx="14" cy="39" r="3" />
          <circle cx="34" cy="39" r="3" />
        </svg>
      )
    case EntityType.LOCATION:
      return (
        <svg viewBox="0 0 48 48" className={cls} fill="none" strokeWidth="1.5" aria-hidden="true">
          <path d="M24 44s14-13.5 14-24a14 14 0 1 0-28 0c0 10.5 14 24 14 24z" />
          <circle cx="24" cy="20" r="5" />
        </svg>
      )
    case EntityType.FACTION:
      return (
        <svg viewBox="0 0 48 48" className={cls} fill="none" strokeWidth="1.5" aria-hidden="true">
          <path d="M24 4l16 6v10c0 12-7 20-16 24C15 40 8 32 8 20V10z" />
          <path d="M17 24l5 5 9-10" />
        </svg>
      )
    case EntityType.BUSINESS:
      return (
        <svg viewBox="0 0 48 48" className={cls} fill="none" strokeWidth="1.5" aria-hidden="true">
          <path d="M6 18l3-10h30l3 10" />
          <path d="M6 18v22h36V18" />
          <path d="M18 40V26h12v14" />
        </svg>
      )
    case EntityType.TRAILER:
      return (
        <svg viewBox="0 0 48 48" className={cls} fill="none" strokeWidth="1.5" aria-hidden="true">
          <rect x="5" y="10" width="38" height="28" rx="3" />
          <path d="M20 18l11 6-11 6z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 48 48" className={cls} fill="none" strokeWidth="1.5" aria-hidden="true">
          <rect x="8" y="8" width="32" height="32" rx="2" />
        </svg>
      )
  }
}

const CATEGORY_FALLBACK_LABEL: Partial<Record<EntityType, string>> = {
  [EntityType.CHARACTER]: 'Sin imagen verificada',
  [EntityType.VEHICLE]: 'Sin imagen verificada',
  [EntityType.LOCATION]: 'Sin imagen verificada',
  [EntityType.FACTION]: 'Sin imagen verificada',
  [EntityType.BUSINESS]: 'Sin imagen verificada',
  [EntityType.TRAILER]: 'Sin miniatura verificada',
}

export function EntityImage({ entity, image, variant = 'thumbnail', className }: EntityImageProps) {
  const resolved = image ?? null
  const isAvatar = variant === 'avatar'

  return (
    <div
      className={cn(
        'card-media relative shrink-0 overflow-hidden rounded-lg border border-gta-border bg-gta-dark',
        isAvatar && 'card-media--avatar rounded-md',
        ASPECT[variant],
        className
      )}
    >
      {resolved ? (
        <>
          {resolved.remote ? (
            // Miniatura de YouTube (img.youtube.com): dominio externo no
            // configurado en next.config.js `images` a propósito (el resto
            // del sitio nunca hotlinkea assets externos), mismo criterio
            // que ya usa GalleryExplorer para las piezas de video.
            // eslint-disable-next-line @next/next/no-img-element -- ver comentario arriba
            <img
              src={resolved.src}
              alt={resolved.alt}
              loading="lazy"
              className="card-media-image absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={resolved.src}
              alt={resolved.alt}
              fill
              sizes={SIZES[variant]}
              className="card-media-image object-cover"
            />
          )}
          {!isAvatar && <div className="card-media-sheen" aria-hidden="true" />}
          {!isAvatar && <div className="card-media-vignette" aria-hidden="true" />}
        </>
      ) : (
        <div className="card-media-fallback absolute inset-0 flex flex-col items-center justify-center gap-2">
          {!isAvatar && <div className="card-media-fallback-sweep" aria-hidden="true" />}
          {!isAvatar && <GridPattern width={20} height={20} className="opacity-40" />}
          <div className="card-media-fallback-glyph">
            <CategoryGlyph type={entity.type} size={isAvatar ? 'sm' : 'default'} />
          </div>
          {!isAvatar && (
            <span className="relative text-[10px] font-medium uppercase tracking-wider text-gta-text-secondary/80">
              {CATEGORY_FALLBACK_LABEL[entity.type] ?? 'Sin imagen verificada'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
