import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { SellVehicleLeadForm } from '@/components/monetization/SellVehicleLeadForm'

/**
 * Landing de venta/tasación de usados — ver `SellVehicleLeadForm.tsx`
 * para el porqué de este canal. Esta página es el destino tanto de la
 * guía `como-tasar-auto-usado-antes-de-vender` (que explica CÓMO tasar
 * pero no capturaba el lead) como del footer/nav — un lugar único donde
 * cae toda la intención de venta del sitio, en vez de repetir el
 * formulario completo en cada ficha de vehículo.
 */
export const metadata: Metadata = {
  title: `Vendé tu auto o moto | ${SITE_NAME}`,
  description:
    'Dejá los datos de tu vehículo usado y recibí propuestas reales de concesionarias interesadas en comprarlo o tomarlo como parte de pago.',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/vender-tu-auto` },
  openGraph: {
    type: 'website',
    title: `Vendé tu auto o moto | ${SITE_NAME}`,
    description: 'Recibí propuestas reales de concesionarias interesadas en tu usado.',
    url: `${SITE_URL}/vender-tu-auto`,
    siteName: SITE_NAME,
  },
}

export default function VenderTuAutoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal>
        <div className="mb-8">
          <p className="eyebrow mb-3 text-xs font-semibold uppercase tracking-wide text-auto-accent-strong">
            Vendé o entregá tu usado
          </p>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            ¿Querés vender tu auto o moto? <span className="text-gradient-vice">Contanos y te contactamos</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">
            Dejá los datos de tu vehículo y las concesionarias interesadas en comprarlo (o tomarlo como parte de
            pago) te contactan directo. Sin comisión para vos, sin obligación de aceptar ninguna oferta.
          </p>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="mb-8 grid gap-3 rounded-xl border border-edge bg-surface-alt p-5 text-sm text-neutral-600 sm:grid-cols-3">
          <p>
            <span className="block font-display font-semibold text-neutral-900">1. Contanos</span>
            Marca, modelo, año y estado general.
          </p>
          <p>
            <span className="block font-display font-semibold text-neutral-900">2. Te contactamos</span>
            Solo si hay una propuesta real para vos.
          </p>
          <p>
            <span className="block font-display font-semibold text-neutral-900">3. Vos decidís</span>
            Sin obligación de vender ni de responder.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <SellVehicleLeadForm trackingLabelPrefix="vender-tu-auto-landing" />
      </Reveal>

      <Reveal delay={140}>
        <p className="mt-6 text-center text-xs text-neutral-400">
          ¿Todavía no sabés cuánto vale? Mirá la guía{' '}
          <Link href="/guias/como-tasar-auto-usado-antes-de-vender" className="link-underline text-auto-accent-strong">
            cómo tasar tu auto usado
          </Link>
          .
        </p>
      </Reveal>

      <Reveal delay={170}>
        <p className="mt-2 text-center text-xs text-neutral-400">
          ¿Vas a venderlo vos mismo? Generá un{' '}
          <Link href="/vender-tu-auto/cartel" className="link-underline text-auto-accent-strong">
            cartel de venta profesional en PDF
          </Link>
          .
        </p>
      </Reveal>
    </div>
  )
}
