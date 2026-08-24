import Image from 'next/image'
import { Entity, EntityType } from '@/types'
import type { ResolvedDisplayImage } from '@/lib/images'
import { GridPattern } from '@/components/ui/GridPattern'
import { SimpleLightbox } from '@/components/ui/SimpleLightbox'
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
   * 'thumbnail' → card de listado (más ancha que alta)
   * 'portrait'  → sidebar de la ficha individual (más alta)
   * 'avatar'    → miniatura cuadrada compacta (paneles de relaciones, timeline)
   */
  variant?: 'thumbnail' | 'portrait' | 'avatar'
  /**
   * Por defecto `false`: la primera pintura relevante de la HOME sigue
   * siendo el hero animado de texto, no una foto de entidad, así que ahí
   * ninguna EntityCard debe pedir priority.
   *
   * Pero en las páginas de listado (`/vehiculos`, `/personajes`, etc.) el
   * grid de cards empieza inmediatamente después de un `<h1>` corto — en
   * viewports angostos el LCP real de esas rutas es la primera imagen del
   * grid, no el título (medido, ver docs/audit-performance-2026-08.md
   * sección 3). El caller (la página de listado) es quien sabe si esta
   * card es de las primeras visibles sin scroll; por eso esto es una prop
   * explícita y no una decisión interna de este componente.
   */
  priority?: boolean
  className?: string
}

const ASPECT: Record<NonNullable<EntityImageProps['variant']>, string> = {
  thumbnail: 'aspect-[16/9]',
  portrait: 'aspect-[4/5]',
  avatar: 'aspect-square',
}

/**
 * Anchos reales que next/image debe pedir para cada variante, ajustados al
 * layout de cada superficie donde se usa (antes `portrait` estaba fijo en
 * '320px' sin importar el ancho real del sidebar de la ficha — eso hacía
 * que se sirviera una versión más chica de la que el navegador terminaba
 * estirando, produciendo el efecto "pixelado" pese a tener el original en
 * alta resolución guardado en el repo).
 *
 * `portrait` pide deliberadamente MÁS ancho del que mide su contenedor en
 * CSS (440px reales, pero acá se declara como si tuviera 900px). Esto no
 * es un error: es la única forma confiable de garantizar nitidez sin
 * conocer el devicePixelRatio real de cada pantalla. El algoritmo de
 * `sizes` de next/image elige, del array `imageSizes` de next.config.js,
 * el primer candidato >= (ancho-declarado × devicePixelRatio). Con el
 * ancho real (440px) y DPR=1 eso resolvía a 512px — que en pantallas con
 * escalado de SO (125%/150%, muy común en Windows) queda por debajo de
 * lo necesario y el navegador termina estirando esos 512px, percibido
 * como imagen "pixelada" aun siendo el comportamiento esperado del
 * algoritmo. Sobre-declarar el ancho fuerza siempre un candidato de la
 * franja 1024–1280px para esta pieza puntual (la más grande y más
 * mirada del sitio), a costa de unos KB extra que acá no importan.
 */
const SIZES: Record<NonNullable<EntityImageProps['variant']>, string> = {
  thumbnail: '(min-width: 1024px) 700px, (min-width: 640px) 90vw, 100vw',
  portrait: '(min-width: 1024px) 900px, (min-width: 640px) 100vw, 100vw',
  avatar: '56px',
}

/** Calidad de codificación por variante. Portrait es la pieza "hero" de la
 * ficha (y la que se ve ampliada en el lightbox), así que va con la
 * calidad más alta; thumbnail se ve pequeña en grillas de listado y no
 * necesita tanto peso. */
const QUALITY: Record<NonNullable<EntityImageProps['variant']>, number> = {
  thumbnail: 90,
  portrait: 97,
  avatar: 75,
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

export function EntityImage({ entity, image, variant = 'thumbnail', priority = false, className }: EntityImageProps) {
  const resolved = image ?? null
  const isAvatar = variant === 'avatar'
  /** Marca visual de que la FOTO (no la entidad) es una recreación no
   *  oficial generada con IA. Deliberadamente independiente de
   *  `entity.status` (confirmado/rumor/nuestro es el nivel de evidencia
   *  del objeto en sí; esto es sobre la procedencia del archivo de
   *  imagen) — así un objeto "confirmado" con foto IA muestra ambas
   *  cosas: badge de estado real + este sello sobre la imagen. Se
   *  omite en 'avatar' por tamaño (56px, sin espacio legible). */
  const isAiImage = entity.image?.source === 'unverified'
  // Solo el retrato de la ficha (variant="portrait") se puede ampliar: es
  // la única variante que NO se renderiza anidada dentro de un <Link> de
  // tarjeta (ver EntityCard, que usa 'thumbnail'/'avatar' como parte de la
  // navegación de la card completa — ahí un botón de lightbox anidado
  // rompería esa navegación y sería HTML inválido, botón dentro de link).
  const isZoomable = variant === 'portrait' && resolved && !resolved.remote

  const mediaContent = (
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
              className={cn('absolute inset-0 h-full w-full object-cover', variant === 'portrait' ? 'card-media-image-static' : 'card-media-image')}
            />
          ) : (
            <Image
              src={resolved.src}
              alt={resolved.alt}
              fill
              sizes={SIZES[variant]}
              quality={QUALITY[variant]}
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              className={cn('object-cover', variant === 'portrait' ? 'card-media-image-static' : 'card-media-image')}
            />
          )}
          {!isAvatar && <div className="card-media-sheen" aria-hidden="true" />}
          {!isAvatar && <div className="card-media-vignette" aria-hidden="true" />}
          {!isAvatar && isAiImage && (
            <span
              className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300 backdrop-blur-sm"
              title="Recreación generada con IA — no es material oficial de Rockstar Games"
            >
              IA
            </span>
          )}
          {isZoomable && (
            <div className="gallery-tile-zoom-icon !opacity-100" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M11 8v6M8 11h6M21 21l-4.3-4.3" />
              </svg>
            </div>
          )}
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
          {/* Placeholders sin imagen resuelta todavía: se completan con IA,
              no con material oficial, así que llevan el mismo sello que
              una imagen ya subida con image.source='unverified' — no hay
              que esperar a que se cargue el archivo para avisarlo. */}
          {!isAvatar && (
            <span
              className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300 backdrop-blur-sm"
              title="Recreación generada con IA — no es material oficial de Rockstar Games"
            >
              IA
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (isZoomable && resolved) {
    return (
      <SimpleLightbox src={resolved.src} alt={resolved.alt} triggerClassName="rounded-lg">
        {mediaContent}
      </SimpleLightbox>
    )
  }

  return mediaContent
}
