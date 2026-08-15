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

          {/* Legal */}
          <div>
            <h3 className="eyebrow mb-4 text-xs font-semibold uppercase text-gta-accent-strong">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Términos de Uso
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent-strong"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </Reveal>

        {/* Copyright */}
        <Reveal delay={150} className="relative mt-10 pt-8 text-center text-sm text-gta-text-tertiary">
          <div className="section-divider absolute inset-x-0 top-0" aria-hidden="true" />
          <p className="font-mono text-xs tracking-wide">
            © {currentYear} GTA6 Codex. Not affiliated with Rockstar Games or Take-Two Interactive.
          </p>
        </Reveal>
      </div>
    </footer>
  )
}
