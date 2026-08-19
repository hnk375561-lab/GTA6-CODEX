import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-codex.vercel.app'
const SITE_NAME = 'GTA6 Codex'

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
      <p className="eyebrow mb-4 text-xs font-semibold uppercase text-gta-accent-strong">
        Legal
      </p>
      <h1 className="mb-8 text-3xl font-bold text-gta-text sm:text-4xl">
        Términos de Uso
      </h1>

      <div className="prose-legal max-w-none space-y-8 text-gta-text-secondary/80">
        <p className="text-sm text-gta-text-tertiary">
          Última actualización: agosto de 2026
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">1. Aceptación</h2>
          <p>
            Al usar {SITE_NAME} ({SITE_URL}) aceptás estos términos. Si no estás de
            acuerdo, te pedimos que no uses el sitio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">2. Naturaleza del sitio</h2>
          <p>
            {SITE_NAME} es un proyecto editorial independiente, no oficial y sin
            fines de lucro comercial afiliado. No está asociado, respaldado ni
            patrocinado por Rockstar Games, Take-Two Interactive Software, Inc.,
            ni ninguna de sus subsidiarias. Grand Theft Auto, GTA y todos los
            nombres, personajes e imágenes relacionados son marcas registradas
            y propiedad de sus respectivos dueños.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">3. Contenido del sitio</h2>
          <p>
            El contenido editorial (textos, análisis, organización de la
            información) es original y de nuestra autoría. Las imágenes,
            logos y material promocional que pertenecen a Rockstar Games o
            Take-Two se usan con fines informativos y de comentario editorial,
            citando la fuente cuando corresponde. Si sos titular de derechos
            sobre algún material y querés que lo retiremos, escribinos y lo
            resolvemos rápido.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">4. Uso permitido</h2>
          <p>
            Podés navegar y compartir enlaces al sitio libremente. No está
            permitido reproducir el contenido editorial de forma masiva sin
            autorización, ni usar el sitio para actividades ilegales o que
            afecten su funcionamiento normal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">5. Precisión de la información</h2>
          <p>
            Documentamos información pública y, en muchos casos, no confirmada
            oficialmente (rumores, filtraciones, análisis). Cada entrada indica
            su nivel de evidencia. No garantizamos que todo el contenido sea
            exacto o esté siempre actualizado.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">6. Publicidad y monetización</h2>
          <p>
            El sitio puede mostrar publicidad de terceros (como Google AdSense)
            o enlaces de afiliados para sostener su mantenimiento. Esto no
            implica que respaldemos los productos o servicios anunciados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">7. Contacto</h2>
          <p>
            Para consultas, reportes de errores o solicitudes de retiro de
            contenido, usá los medios de contacto listados en el sitio.
          </p>
        </section>
      </div>
    </div>
  )
}
