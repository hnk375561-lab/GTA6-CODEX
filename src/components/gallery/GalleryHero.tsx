import { Reveal } from '@/components/ui/Reveal'
import { GridPattern } from '@/components/ui/GridPattern'
import { HeroSceneSVG } from '@/components/layout/HeroSceneSVG'

interface GalleryHeroProps {
  total: number
  categoryCount: number
}

/**
 * Header cinematográfico de /galeria: escena SVG original (ver
 * HeroSceneSVG — reemplaza el key art oficial de Rockstar que usaba
 * antes este componente) + degradé "Leonida Nights" + grid técnico
 * sutil, para que la galería abra con la misma fuerza visual que
 * promete el contenido de abajo, en vez de un título plano sobre fondo liso.
 */
export function GalleryHero({ total, categoryCount }: GalleryHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-edge">
      <div className="absolute inset-0" aria-hidden="true">
        <HeroSceneSVG
          variant="cyan"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-auto-dark/60 via-auto-dark/85 to-auto-dark" />
        <div className="absolute inset-0 bg-gradient-to-r from-auto-dark/70 via-transparent to-auto-dark/40" />
        <GridPattern width={48} height={48} className="opacity-[0.12]" />
      </div>

      <div className="container-max relative py-20 sm:py-28">
        <Reveal>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-edge bg-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-auto-accent-strong backdrop-blur-sm">
            Archivo visual
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tightest text-neutral-900 sm:text-6xl">
            Galería <span className="text-gradient-vice">de autos</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500 sm:text-lg">
            Fotografía de stock y propia de autos y motos, organizada por marca y modelo — cada
            imagen conectada con su ficha técnica.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-neutral-500">
            <div>
              <span className="font-display text-2xl font-bold text-neutral-900">{total}</span>
              <span className="ml-2 uppercase tracking-wide text-neutral-400">imágenes documentadas</span>
            </div>
            <div className="h-8 w-px bg-edge" aria-hidden="true" />
            <div>
              <span className="font-display text-2xl font-bold text-neutral-900">{categoryCount}</span>
              <span className="ml-2 uppercase tracking-wide text-neutral-400">categorías</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
