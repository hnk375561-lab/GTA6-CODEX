'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface VideoEmbedProps {
  /** URL pública y directa del archivo de video (mp4). */
  videoSrc: string
  title: string
  /** Si es true, reproduce en loop, muteado y sin controles (uso hero/banner). */
  ambient?: boolean
  className?: string
}

/**
 * Reproductor de video mp4 directo (Vercel Blob u otro host que sirva el
 * archivo tal cual). Mismo criterio de costo/UX que `YouTubeEmbed`: facade
 * de click-to-load — no se monta ningún `<video>` en el DOM hasta que el
 * usuario hace click, así que no dispara ninguna petición de red antes de
 * eso (a diferencia de YouTube, acá no hay miniatura remota que mostrar de
 * entrada). Una vez montado, `preload="metadata"` sigue limitando la carga
 * inicial al header del archivo, no al video completo.
 *
 * `ambient`: variante sin controles ni interacción, pensada para una única
 * pieza de key art en loop (ej. portada), no para contenido narrativo con
 * audio ni para listas de varios clips.
 */
export function VideoEmbed({ videoSrc, title, ambient = false, className }: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(ambient)

  if (ambient) {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={videoSrc}
          aria-label={title}
          preload="metadata"
          muted
          loop
          playsInline
          autoPlay
        />
      </div>
    )
  }

  if (loaded) {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
        <video
          className="absolute inset-0 h-full w-full"
          src={videoSrc}
          title={title}
          preload="metadata"
          muted
          playsInline
          controls
          autoPlay
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
      {/* Sin miniatura remota (a diferencia de YouTube): a propósito NO se
          monta ningún <video> acá. `preload` no evita la petición inicial
          del recurso en todos los navegadores, así que la única forma de
          garantizar cero descargas antes del click — y evitar que varias
          tarjetas de clips arranquen la descarga a la vez al cargar la
          página — es no crear el elemento hasta que el usuario interactúa. */}
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
