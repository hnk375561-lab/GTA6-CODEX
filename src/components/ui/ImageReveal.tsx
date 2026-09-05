'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageRevealProps {
  src: string
  alt: string
  /** true → `<img>` nativo para hosts externos (miniaturas de YouTube,
   *  etc.) que next/image no puede optimizar sin configurar el dominio. */
  remote?: boolean
  sizes?: string
  quality?: number
  priority?: boolean
  /** Clases extra para el `<img>` real (object-fit, hover, etc.). */
  imgClassName?: string
  /** Clases para el envoltorio que llena el contenedor del caller. Por
   *  defecto `absolute inset-0` (el caller declara `relative` en su
   *  superficie de media). */
  className?: string
}

/**
 * Media (imagen local con next/image o remota con `<img>`) con revelado
 * sutil: el contenedor muestra la superficie de esqueleto
 * (`.media-reveal--loading`, shimmer CSS) y la imagen aparece con un fade
 * corto (`.media-img` → `.media-img--loaded`) apenas carga.
 *
 * Es un componente 'use client' a propósito: `EntityImage` se renderiza
 * tanto desde Server Components como desde árboles cliente, así que el
 * estado `loaded` que controla el fade NO puede vivir ahí (violaría la
 * restricción "sin hooks del lado servidor" documentada en EntityImage).
 * Este hijo lo encapsula y recibe `src`/`alt` ya resueltas como props.
 *
 * Anti-race de hidratación: si la imagen está en caché y su evento `load`
 * ocurrió ANTES de que React montara los handlers, un check en
 * `useEffect` (via `naturalWidth > 0`) la marca como cargada igual —
 * sin eso, una imagen ya cargada quedaría con el fade atascado en 0.
 */
export function ImageReveal({
  src,
  alt,
  remote = false,
  sizes,
  quality,
  priority = false,
  imgClassName,
  className,
}: ImageRevealProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const img = wrapRef.current?.querySelector('img')
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true)
  }, [src])

  const markLoaded = () => setLoaded(true)

  return (
    <div
      ref={wrapRef}
      className={cn('media-reveal', loaded ? 'media-reveal--loaded' : 'media-reveal--loading', className)}
    >
      {/* El fade (`.media-img*`) va en esta capa envolvente, NO en el `<img>`:
          el `<img>` real conserva sus propias clases de media (por ej.
          `card-media-image`/`gallery-tile-image`, que declaran su propio
          `transition` de transform/filter en hover) — si el `transition`
          shorthand de `.media-img` cayera sobre el mismo elemento, pisaría
          esas animaciones existentes. La capa llena `.media-reveal`
          (absolute inset-0) y deja ver la superficie esqueleto de atrás
          mientras fadea. */}
      <div className={cn('media-img media-reveal__img', loaded && 'media-img--loaded')}>
        {remote ? (
          // eslint-disable-next-line @next/next/no-img-element -- hosts externos (ej. i.ytimg.com) que next/image no puede servirse sin configuración de dominio; mismo criterio que ya usa el sitio en GalleryExplorer.
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            className={cn('h-full w-full', imgClassName)}
            onLoad={markLoaded}
            onError={markLoaded}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            quality={quality}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className={imgClassName}
            onLoad={markLoaded}
            onError={markLoaded}
          />
        )}
      </div>
    </div>
  )
}