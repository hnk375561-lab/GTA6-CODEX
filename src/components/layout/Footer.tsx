'use client'

import Link from 'next/link'
import { EntityType } from '@/types'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME } from '@/config/site'
import { NewsletterSignupForm } from '@/components/monetization/NewsletterSignupForm'
import { SupportButton } from '@/components/monetization/SupportButton'
import { smoothScrollTo } from '@/lib/scroll/smooth-scroll'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-edge bg-auto-darker pt-14 pb-[8.25rem] md:pb-14">
      {/* pb móvil extra: el anuncio ancla sticky (solo ≤md) flota sobre el
          pie del viewport y sin este colchón el último bloque del footer
          quedaba tapado al llegar al final del scroll. En md+ el ancla no
          existe y el padding vuelve al normal. */}
      <div className="section-divider absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8 xl:px-12">
        <Reveal className="grid gap-10 md:grid-cols-3">
          {/* About */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-auto-accent to-auto-accent-orange">
                <span className="font-display text-[10px] font-bold text-auto-darker">{SITE_NAME.charAt(0)}</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-neutral-900">{SITE_NAME}</h3>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-neutral-500">
              Fichas técnicas de autos y motos con specs reales, comparador lado a lado y fuente por cada dato.
            </p>
            <NewsletterSignupForm className="mt-6 max-w-xs" trackingSource="footer" />
            <SupportButton className="mt-4" />
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="eyebrow mb-4 text-xs font-semibold uppercase text-auto-accent-strong">Categorías</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${EntityType.VEHICLE}`}
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Vehículos
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.MANUFACTURER}`}
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Fabricantes
                </Link>
              </li>
              <li>
                <Link
                  href={`/${EntityType.GUIDE}`}
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Guías de compra
                </Link>
              </li>
              {/* Noticias sigue afuera de la navegación (solo 3
                  artículos hoy) — ver Header.tsx para el criterio. */}
            </ul>
          </div>

          {/* Secciones */}
          <div>
            <h3 className="eyebrow mb-4 text-xs font-semibold uppercase text-auto-accent-strong">Secciones</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/buscar"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Búsqueda
                </Link>
              </li>
              <li>
                <Link
                  href="/galeria"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Galería
                </Link>
              </li>
              <li>
                <Link
                  href="/comparar"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Comparar
                </Link>
              </li>
              <li>
                <Link
                  href="/mapa"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Mapa
                </Link>
              </li>
              <li>
                <Link
                  href="/favoritos"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Favoritos
                </Link>
              </li>
              <li>
                <Link
                  href="/financiamiento"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Financiamiento
                </Link>
              </li>
              <li>
                <Link
                  href="/vender-tu-auto"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Vendé tu auto
                </Link>
              </li>
              <li>
                <Link
                  href="/tramites-vehiculo"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Trámites (transferencia/patentamiento)
                </Link>
              </li>
              <li>
                <Link
                  href="/anunciate"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Anunciate acá
                </Link>
              </li>
              <li>
                <Link
                  href="/licencia-datos"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Licencia de datos (B2B)
                </Link>
              </li>
              <li>
                <Link
                  href="/concesionarias-concepcion-del-uruguay"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Directorio Concepción del Uruguay
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/terminos"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Términos de Uso
                </Link>
              </li>
              <li>
                <a
                  href="mailto:uruspotcdu@gmail.com"
                  className="link-underline text-neutral-500 transition-colors hover:text-auto-accent-strong"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </Reveal>

        {/* Volver arriba — acción terminal del pie de página. El FAB
            global (BackToTop) cubre el "durante el scroll"; esta es la
            alternativa anclada y con texto para la persona que llegó al
            final del contenido y (sobre todo en desktop, donde el FAB es
            compacto y sin label) prefiere una acción explícita de cierre. */}
        <Reveal delay={100} className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => smoothScrollTo(0)}
            aria-label="Volver arriba"
            className="tap-scale inline-flex items-center gap-2 rounded-full border border-auto-border/60 px-4 py-2.5 text-xs font-medium text-neutral-400 transition-colors hover:border-auto-accent/60 hover:text-auto-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auto-accent"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
            Volver arriba
          </button>
        </Reveal>

        {/* Disclaimer + Copyright */}
        <Reveal delay={150} className="relative mt-10 space-y-3 pt-8 text-center text-neutral-400">
          <div className="section-divider absolute inset-x-0 top-0" aria-hidden="true" />
          <p className="mx-auto max-w-2xl text-xs leading-relaxed">
            {SITE_NAME} es un proyecto editorial independiente. Las marcas y nombres de fabricantes mencionados
            pertenecen a sus respectivos dueños y se citan aquí con fines informativos y de comparación técnica.
          </p>
          <p className="font-mono text-xs tracking-wide">© {currentYear} {SITE_NAME}.</p>
        </Reveal>
      </div>
    </footer>
  )
}
