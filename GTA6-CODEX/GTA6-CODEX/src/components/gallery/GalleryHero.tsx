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
    <section className="relative overflow-hidden border-b border-gta-border">
      <div className="absolute inset-0" aria-hidden="true">
        <HeroSceneSVG
          variant="cyan"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gta-dark/60 via-gta-dark/85 to-gta-dark" />
        <div className="absolute inset-0 bg-gradient-to-r from-gta-dark/70 via-transparent to-gta-dark/40" />
        <GridPattern width={48} height={48} className="opacity-[0.12]" />
      </div>

      <div className="container-max relative py-20 sm:py-28">
        <Reveal>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gta-border bg-gta-dark/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gta-accent-strong backdrop-blur-sm">
            Archivo visual
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tightest text-gta-text sm:text-6xl">
            Galería <span className="text-gradient-vice">Leonida</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-gta-text-secondary sm:text-lg">
            Fotografía oficial y material promocional de Grand Theft Auto VI, organizado por
            personajes, ubicaciones y key art — cada imagen conectada con su ficha, su evidencia y,
            cuando existe, la escena de tráiler donde aparece.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-gta-text-secondary">
            <div>
              <span className="font-display text-2xl font-bold text-gta-text">{total}</span>
              <span className="ml-2 uppercase tracking-wide text-gta-text-tertiary">imágenes documentadas</span>
            </div>
            <div className="h-8 w-px bg-gta-border" aria-hidden="true" />
            <div>
              <span className="font-display text-2xl font-bold text-gta-text">{categoryCount}</span>
              <span className="ml-2 uppercase tracking-wide text-gta-text-tertiary">categorías</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
