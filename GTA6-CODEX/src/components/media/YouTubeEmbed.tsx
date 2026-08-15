'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface YouTubeEmbedProps {
  /** Id de video de YouTube (11 caracteres). */
  embedId: string
  title: string
  /** Miniatura a mostrar antes de cargar el iframe real. */
  thumbnailSrc: string
  /** Si es true, muestra directamente el iframe sin esperar click. */
  autoLoad?: boolean
  className?: string
}

/**
 * Embed de YouTube "facade": muestra una miniatura + botón de play y solo
 * monta el `<iframe>` real al hacer click (o de entrada si `autoLoad`).
 * Evita pagar el costo de carga de youtube-nocookie.com en cada tarjeta de
 * galería que nunca se reproduce — solo el video que el usuario realmente
 * abre paga ese costo.
 */
export function YouTubeEmbed({ embedId, title, thumbnailSrc, autoLoad = false, className }: YouTubeEmbedProps) {
  const [loaded, setLoaded] = useState(autoLoad)

  if (loaded) {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${embedId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className={cn(
        'group relative aspect-video w-full overflow-hidden rounded-xl border border-gta-border bg-gta-darker',
        className
      )}
      aria-label={`Reproducir: ${title}`}
    >
      <Image
        src={thumbnailSrc}
        alt={title}
        fill
        sizes="(min-width: 768px) 60vw, 100vw"
        className="object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-gta-dark/30 transition-colors group-hover:bg-gta-dark/10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gta-accent/90 shadow-gta-lg transition-transform duration-200 group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      <span className="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-gta-dark/90 to-transparent px-3 pb-2 pt-6 text-left text-sm font-medium text-gta-text">
        {title}
      </span>
    </button>
  )
}
