import type { Metadata } from 'next'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'

export const metadata: Metadata = {
  title: `Términos de Uso | ${SITE_NAME}`,
  description: `Términos de uso de ${SITE_NAME}: condiciones para usar el sitio y su contenido.`,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/terminos` },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <div className="container-narrow py-16 sm:py-20">
      <Reveal>
        <p className="eyebrow mb-4 text-xs font-semibold uppercase text-auto-accent-strong">
          Legal
        </p>
        <h1 className="mb-8 text-3xl font-bold text-neutral-900 sm:text-4xl">
          Términos de Uso
        </h1>
      </Reveal>

      <Reveal delay={100} className="stagger prose-legal max-w-none space-y-8 text-neutral-500/80">
        <p className="text-sm text-neutral-400">
          Última actualización: agosto de 2026
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900">1. Aceptación</h2>
          <p>
            Al usar {SITE_NAME} ({SITE_URL}) aceptás estos términos. Si no estás de
            acuerdo, te pedimos que no uses el sitio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900">2. Naturaleza del sitio</h2>
          <p>
            {SITE_NAME} es un proyecto editorial independiente dedicado a fichas
            técnicas y comparación de autos y motos. No está asociado,
            respaldado ni patrocinado por ninguna marca, fabricante o
            concesionaria mencionada en el sitio. Los nombres, logos y marcas
            de los vehículos citados son propiedad de sus respectivos
            fabricantes y se mencionan únicamente con fines informativos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900">3. Contenido del sitio</h2>
          <p>
            El contenido editorial (textos, fichas técnicas, comparativas,
            organización de la información) es original y de nuestra autoría,
            elaborado a partir de especificaciones públicas del fabricante y
            prensa especializada, citando la fuente cuando corresponde. Las
            imágenes utilizadas son de stock libre de derechos o fotografía
            propia — no usamos material oficial de marca sin licencia. Si sos
            titular de derechos sobre algún material y querés que lo
            retiremos, escribinos a{' '}
            <a
              href="mailto:uruspotcdu@gmail.com"
              className="link-underline text-auto-accent-strong transition-colors hover:text-auto-accent"
            >
              uruspotcdu@gmail.com
            </a>{' '}
            y lo resolvemos rápido.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900">4. Uso permitido</h2>
          <p>
            Podés navegar y compartir enlaces al sitio libremente. No está
            permitido reproducir el contenido editorial de forma masiva sin
            autorización, ni usar el sitio para actividades ilegales o que
            afecten su funcionamiento normal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900">5. Precisión de la información</h2>
          <p>
            Documentamos especificaciones técnicas, precios y datos de
            vehículos a partir de fuentes públicas del fabricante y prensa
            especializada. Cada ficha indica su fuente y fecha de
            actualización. Los precios y specs pueden variar según el mercado
            y el momento de consulta; no garantizamos que todo el contenido
            esté siempre actualizado.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900">6. Publicidad y monetización</h2>
          <p>
            El sitio puede mostrar publicidad de terceros (como Google AdSense)
            o enlaces de afiliados para sostener su mantenimiento. Esto no
            implica que respaldemos los productos o servicios anunciados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900">7. Contacto</h2>
          <p>
            Para consultas, reportes de errores o solicitudes de retiro de
            contenido, escribinos a{' '}
            <a
              href="mailto:uruspotcdu@gmail.com"
              className="link-underline text-auto-accent-strong transition-colors hover:text-auto-accent"
            >
              uruspotcdu@gmail.com
            </a>
            .
          </p>
        </section>
      </Reveal>
    </div>
  )
}
