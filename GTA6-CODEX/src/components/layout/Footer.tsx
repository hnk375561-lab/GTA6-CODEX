'use client'

import Link from 'next/link'
import { EntityType } from '@/types'
import { Reveal } from '@/components/ui/Reveal'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gta-border bg-gta-darker py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="grid gap-8 md:grid-cols-3">
          {/* About */}
          <div>
            <h3 className="mb-4 font-bold text-gta-text">GTA6 Codex</h3>
            <p className="text-sm text-gta-text-secondary">
              Un wiki editorial de primer nivel sobre Grand Theft Auto 6. Información verificada, rumores y análisis.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 font-bold text-gta-text">Categorías</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${EntityType.CHARACTER}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent"
                >
                  Personajes
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.VEHICLE}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent"
                >
                  Vehículos
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.LOCATION}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent"
                >
                  Ubicaciones
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.MISSION}`}
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent"
                >
                  Misiones
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 font-bold text-gta-text">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent"
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent"
                >
                  Términos de Uso
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="link-underline text-gta-text-secondary transition-colors hover:text-gta-accent"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </Reveal>

        {/* Copyright */}
        <Reveal delay={150} className="mt-8 border-t border-gta-border pt-8 text-center text-sm text-gta-text-secondary">
          <p>
            © {currentYear} GTA6 Codex. Not affiliated with Rockstar Games or Take-Two Interactive.
          </p>
        </Reveal>
      </div>
    </footer>
  )
}
