'use client'

import Link from 'next/link'
import { EntityType } from '@/types'
import { Reveal } from '@/components/ui/Reveal'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-gta-border bg-gta-darker py-14">
      <div className="section-divider absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="grid gap-10 md:grid-cols-3">
          {/* About */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-gta-accent to-gta-accent-orange">
                <span className="font-display text-[10px] font-bold text-gta-darker">GTA</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-gta-text">GTA6 Codex</h3>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-gta-text-secondary">
              Un wiki editorial de primer nivel sobre Grand Theft Auto 6. Información verificada, rumores y análisis.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="eyebrow mb-4 text-xs font-semibold uppercase text-gta-accent-strong">Categorías</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${EntityType.CHARACTER}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Personajes
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.VEHICLE}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Vehículos
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.LOCATION}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Ubicaciones
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.MISSION}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Misiones
                </Link>
              </li>
            </ul>
          </div>

          {/* Secciones */}
          <div>
            <h3 className="eyebrow mb-4 text-xs font-semibold uppercase text-gta-accent-strong">Secciones</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/buscar"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Búsqueda
                </Link>
              </li>
              <li>
                <Link
                  href="/galeria"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Galería
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.TRAILER}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Trailers
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/terminos"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Términos de Uso
                </Link>
              </li>
            </ul>
          </div>
        </Reveal>

        {/* Disclaimer + Copyright */}
        <Reveal delay={150} className="relative mt-10 space-y-3 pt-8 text-center text-gta-text-tertiary">
          <div className="section-divider absolute inset-x-0 top-0" aria-hidden="true" />
          <p className="mx-auto max-w-2xl text-xs leading-relaxed">
            GTA6 Codex es un proyecto editorial independiente y no oficial. No está
            afiliado, respaldado ni patrocinado por Rockstar Games ni Take-Two
            Interactive Software, Inc. Grand Theft Auto, GTA y las imágenes,
            personajes y marcas relacionadas son propiedad de sus respectivos
            dueños y se usan aquí con fines informativos y de comentario editorial.
          </p>
          <p className="font-mono text-xs tracking-wide">
            © {currentYear} GTA6 Codex. Not affiliated with Rockstar Games or Take-Two Interactive.
          </p>
        </Reveal>
      </div>
    </footer>
  )
}
