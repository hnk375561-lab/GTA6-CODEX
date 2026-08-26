'use client'

import Link from 'next/link'
import { EntityType } from '@/types'
import { Reveal } from '@/components/ui/Reveal'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-auto-border bg-auto-darker py-14">
      <div className="section-divider absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="grid gap-10 md:grid-cols-3">
          {/* About */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-auto-accent to-auto-accent-orange">
                <span className="font-display text-[10px] font-bold text-auto-darker">A</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-auto-text">AutoFicha</h3>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-auto-text-secondary">
              Fichas técnicas de autos y motos con specs reales, comparador lado a lado y fuente por cada dato.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="eyebrow mb-4 text-xs font-semibold uppercase text-auto-accent-strong">Categorías</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${EntityType.VEHICLE}`}
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Vehículos
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.NEWS}`}
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Noticias
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.GUIDE}`}
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Guías
                </Link>
              </li>
            </ul>
          </div>

          {/* Secciones */}
          <div>
            <h3 className="eyebrow mb-4 text-xs font-semibold uppercase text-auto-accent-strong">Secciones</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/buscar"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Búsqueda
                </Link>
              </li>
              <li>
                <Link
                  href="/galeria"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Galería
                </Link>
              </li>
              <li>
                <Link
                  href="/comparar"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Comparar
                </Link>
              </li>
              <li>
                <Link
                  href="/mapa"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Mapa
                </Link>
              </li>
              <li>
                <Link
                  href="/favoritos"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Favoritos
                </Link>
              </li>
              <li>
                <Link
                  href="/financiamiento"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Financiamiento
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/terminos"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Términos de Uso
                </Link>
              </li>
              <li>
                <a
                  href="mailto:uruspotcdu@gmail.com"
                  className="link-underline text-auto-text-secondary transition-colors hover:text-auto-accent-strong"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </Reveal>

        {/* Disclaimer + Copyright */}
        <Reveal delay={150} className="relative mt-10 space-y-3 pt-8 text-center text-auto-text-tertiary">
          <div className="section-divider absolute inset-x-0 top-0" aria-hidden="true" />
          <p className="mx-auto max-w-2xl text-xs leading-relaxed">
            AutoFicha es un proyecto editorial independiente. Las marcas y nombres de fabricantes mencionados
            pertenecen a sus respectivos dueños y se citan aquí con fines informativos y de comparación técnica.
          </p>
          <p className="font-mono text-xs tracking-wide">© {currentYear} AutoFicha.</p>
        </Reveal>
      </div>
    </footer>
  )
}
