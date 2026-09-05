import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { ForSaleFlyerForm } from '@/components/monetization/ForSaleFlyerForm'

/**
 * Landing del cartel de venta pago — ver `src/lib/for-sale-flyer.ts` para
 * el modelo de negocio. Vive en `/vender-tu-auto/cartel` (no en la raíz)
 * porque es un producto complementario al lead gratis de
 * `/vender-tu-auto`, no un reemplazo — la persona puede dejar el lead,
 * generar el cartel, o las dos cosas.
 */
export const metadata: Metadata = {
  title: `Cartel de venta para tu auto o moto | ${SITE_NAME}`,
  description:
    'Generá un cartel de venta profesional en PDF con el precio, año y tu contacto, listo para imprimir o compartir en redes y grupos de WhatsApp.',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/vender-tu-auto/cartel` },
  openGraph: {
    type: 'website',
    title: `Cartel de venta para tu auto o moto | ${SITE_NAME}`,
    description: 'PDF listo para imprimir o compartir, con el precio y tu contacto en grande.',
    url: `${SITE_URL}/vender-tu-auto/cartel`,
    siteName: SITE_NAME,
  },
}

export default function CartelVentaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal direction="chapter">
        <div className="mb-8">
          <p className="eyebrow-pop eyebrow mb-3 text-xs font-semibold uppercase tracking-wide text-auto-accent-strong">
            Cartel de venta
          </p>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Un cartel prolijo <span className="text-gradient-vice">vende más rápido</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">
            Completá los datos de tu vehículo y generá un PDF con el precio bien grande, tu contacto y el diseño
            listo para imprimir y pegar en el parabrisas, o compartir directo en Marketplace, OLX o grupos de
            WhatsApp.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <ForSaleFlyerForm />
      </Reveal>

      <Reveal delay={120}>
        <p className="mt-6 text-center text-xs text-neutral-400">
          ¿Preferís que una concesionaria te contacte directo en vez de vender por tu cuenta?{' '}
          <Link href="/vender-tu-auto" className="link-underline text-auto-accent-strong">
            Dejá tus datos acá, es gratis
          </Link>
          .
        </p>
      </Reveal>
    </div>
  )
}
