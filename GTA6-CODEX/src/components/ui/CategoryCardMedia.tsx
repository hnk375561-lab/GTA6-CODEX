import Image from 'next/image'
import type { ResolvedEntityImage } from '@/lib/images'

interface CategoryCardMediaProps {
  /** Primera imagen local real de la categoría, ver `getCategoryPreviewImage`. */
  preview: ResolvedEntityImage | null | undefined
}

/**
 * Fondo de una card de CATEGORÍA (home → "Explorá por sección"): reutiliza
 * el mismo lenguaje `card-media` que las cards de entidad (breathing sutil
 * + barrido de luz + zoom/iluminación al hover, ver globals.css), atenuado
 * detrás del ícono y el texto con un tinte fijo para que sigan legibles.
 *
 * Si la categoría todavía no tiene ninguna imagen local (`preview` null),
 * cae al mismo barrido de escaneo 100% CSS que usa `EntityImage` en su
 * fallback — nunca queda un fondo estático/muerto.
 */
export function CategoryCardMedia({ preview }: CategoryCardMediaProps) {
  return (
    <div className="card-media card-media--category pointer-events-none absolute inset-0" aria-hidden="true">
      {preview ? (
        <Image src={preview.src} alt="" fill sizes="240px" className="card-media-image object-cover" />
      ) : (
        <div className="card-media-fallback-sweep" />
      )}
      <div className="card-media-category-tint" />
    </div>
  )
}
