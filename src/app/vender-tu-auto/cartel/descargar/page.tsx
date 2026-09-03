import Link from 'next/link'
import type { Metadata } from 'next'
import { SITE_NAME } from '@/config/site'

// Mismo criterio que /reporte-premium/descargar: página puramente
// transaccional, noindex, sin contenido propio.
export const metadata: Metadata = {
  title: `Cartel de venta | ${SITE_NAME}`,
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{
    data?: string
    payment_id?: string
    status?: string
    collection_status?: string
  }>
}

export default async function CartelVentaDescargarPage({ searchParams }: PageProps) {
  const params = await searchParams
  const encoded = params.data
  const paymentId = params.payment_id
  const status = params.collection_status || params.status

  const downloadHref =
    paymentId && encoded
      ? `/api/for-sale-flyer/pdf?payment_id=${encodeURIComponent(paymentId)}&data=${encodeURIComponent(encoded)}`
      : null

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      {status === 'approved' && downloadHref ? (
        <>
          <h1 className="font-display text-2xl font-bold text-neutral-900">¡Pago aprobado!</h1>
          <p className="mt-3 text-sm text-neutral-500">
            Tu cartel de venta está listo. Si la descarga no arranca sola, tocá el botón de abajo — el link
            funciona todas las veces que quieras, no vence.
          </p>
          <a
            href={downloadHref}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-auto-accent px-5 py-3 text-sm font-semibold text-auto-darker transition-transform hover:scale-105"
          >
            Descargar PDF
          </a>
        </>
      ) : status === 'pending' || status === 'in_process' ? (
        <>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Pago en proceso</h1>
          <p className="mt-3 text-sm text-neutral-500">
            Mercado Pago todavía está procesando el pago. En cuanto se acredite vas a poder volver a esta misma
            página con el link de descarga.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold text-neutral-900">No se completó el pago</h1>
          <p className="mt-3 text-sm text-neutral-500">
            No se acreditó ningún cobro. Podés volver e intentar de nuevo cuando quieras.
          </p>
        </>
      )}

      <div className="mt-8">
        <Link href="/vender-tu-auto/cartel" className="link-underline text-sm text-neutral-500 hover:text-auto-accent">
          ← Volver al generador de cartel
        </Link>
      </div>
    </div>
  )
}
