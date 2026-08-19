import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gta-6-zona.vercel.app'
const SITE_NAME = 'GTA6 Zona'

export const metadata: Metadata = {
  title: `Política de Privacidad | ${SITE_NAME}`,
  description: `Política de privacidad de ${SITE_NAME}: qué datos recopilamos, cómo los usamos y qué opciones tenés.`,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/privacidad` },
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <div className="container-narrow py-16 sm:py-20">
      <p className="eyebrow mb-4 text-xs font-semibold uppercase text-gta-accent-strong">
        Legal
      </p>
      <h1 className="mb-8 text-3xl font-bold text-gta-text sm:text-4xl">
        Política de Privacidad
      </h1>

      <div className="prose-legal max-w-none space-y-8 text-gta-text-secondary/80">
        <p className="text-sm text-gta-text-tertiary">
          Última actualización: agosto de 2026
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">1. Quiénes somos</h2>
          <p>
            {SITE_NAME} ({SITE_URL}) es un sitio editorial independiente, sin fines
            oficiales, dedicado a documentar información pública sobre el videojuego
            Grand Theft Auto VI. Esta política explica qué datos recopilamos cuando
            visitás el sitio y cómo los usamos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">2. Datos que recopilamos</h2>
          <p>
            Usamos Google Analytics para entender cómo se usa el sitio (páginas
            visitadas, tiempo de permanencia, ubicación aproximada por país/ciudad,
            tipo de dispositivo y navegador). Estos datos son agregados y no te
            identifican personalmente.
          </p>
          <p>
            Si en el futuro incorporamos publicidad (por ejemplo, Google AdSense),
            esos proveedores pueden usar cookies propias para mostrar anuncios
            relevantes. Actualizaremos esta página cuando eso ocurra, detallando
            qué proveedores están activos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">3. Cookies</h2>
          <p>
            El sitio puede usar cookies técnicas (necesarias para el funcionamiento)
            y cookies analíticas (Google Analytics). Podés bloquear o eliminar
            cookies desde la configuración de tu navegador; algunas funciones del
            sitio podrían verse afectadas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">4. Terceros</h2>
          <p>
            No vendemos ni compartimos datos personales con terceros con fines
            comerciales propios. Los únicos terceros que procesan datos son
            proveedores de servicios (como Google Analytics) bajo sus propias
            políticas de privacidad.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">5. Tus derechos</h2>
          <p>
            Podés solicitar información sobre los datos que tenemos asociados a tu
            visita, o pedir que dejemos de procesarlos, escribiéndonos a{' '}
            <a
              href="mailto:uruspotcdu@gmail.com"
              className="link-underline text-gta-accent-strong transition-colors hover:text-gta-accent"
            >
              uruspotcdu@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gta-text">6. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política cuando cambien nuestras prácticas
            (por ejemplo, al sumar publicidad o nuevos servicios). La fecha de
            última actualización siempre figura arriba.
          </p>
        </section>
      </div>
    </div>
  )
}
