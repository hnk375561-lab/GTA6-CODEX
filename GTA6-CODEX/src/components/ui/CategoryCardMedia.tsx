import Image from 'next/image'
import type { ResolvedEntityImage } from '@/lib/images'

interface CategoryCardMediaProps {
  /** Hasta 3 imágenes locales reales de la categoría, en el mismo orden
   *  que devuelve `getCategoryPreviewImages` (la primera es el fondo
   *  principal, las siguientes — hasta 2 — se muestran como miniaturas
   *  superpuestas). Acepta también un solo `ResolvedEntityImage` o
   *  `null`/`undefined` por compatibilidad con callers que todavía
   *  resuelven una sola imagen vía `getCategoryPreviewImage`. */
  previews: ResolvedEntityImage[] | ResolvedEntityImage | null | undefined
}

/**
 * Fondo de una card de CATEGORÍA (home → "Explorá por sección"): reutiliza
 * el mismo lenguaje `card-media` que las cards de entidad (breathing sutil
 * + barrido de luz + zoom/iluminación al hover, ver globals.css) para la
 * imagen principal, atenuado detrás del ícono y el texto con un tinte fijo
 * para que sigan legibles.
 *
 * Fase 8, etapa F (mini-collage): si la categoría tiene más de una imagen
 * local disponible, hasta 2 adicionales se muestran como miniaturas
 * circulares superpuestas en la esquina superior derecha — mismo espíritu
 * que la propuesta original ("2-3 miniaturas superpuestas") sin pisar el
 * tratamiento `card-media-image` de la imagen principal (que sigue siendo
 * la única con la animación de respiración/zoom en hover, para no romper
 * esa lectura visual con 3 elementos animándose a la vez).
 *
 * Si la categoría todavía no tiene ninguna imagen local (`previews` vacío
 * o null), cae al mismo barrido de escaneo 100% CSS que usa `EntityImage`
 * en su fallback — nunca queda un fondo estático/muerto.
 */
export function CategoryCardMedia({ previews }: CategoryCardMediaProps) {
  const list = previews == null ? [] : Array.isArray(previews) ? previews : [previews]
  const [main, ...rest] = list
  const extras = rest.slice(0, 2)

  return (
    <div className="card-media card-media--category pointer-events-none absolute inset-0" aria-hidden="true">
      {main ? (
        <Image
          src={main.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 50vw"
          quality={95}
          className="card-media-image object-cover"
        />
      ) : (
        <div className="card-media-fallback-sweep" />
      )}
      <div className="card-media-category-tint" />

      {extras.length > 0 && (
        <div className="absolute right-3 top-3 z-[1] flex -space-x-3">
          {extras.map((preview, index) => (
            <div
              key={preview.src}
              className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-gta-darker/80 shadow-md"
              style={{
                transform: `rotate(${index === 0 ? -6 : 6}deg)`,
                zIndex: extras.length - index,
              }}
            >
              <Image src={preview.src} alt="" fill sizes="36px" className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
