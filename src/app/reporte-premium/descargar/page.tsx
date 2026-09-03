import Link from 'next/link'
import type { Metadata } from 'next'
import { SITE_NAME } from '@/config/site'

// Página puramente transaccional (llegás acá solo de rebote desde
// Mercado Pago) — no tiene contenido propio que indexar, y ya está
// bloqueada por /api/ el recurso real (el PDF), pero esta página en sí
// también se marca noindex por las dudas, mismo criterio que /dashboard.
export const metadata: Metadata = {
  title: `Reporte premium | ${SITE_NAME}`,
  robots: { index: false, follow: false },
}

interface PageProps {
  // Mercado Pago agrega estos params automáticamente al volver del
  // checkout (ver `back_urls` en create-preference/route.ts). `slugs`
  // es el único que nosotros agregamos a mano en la URL original.
  searchParams: Promise<{
    slugs?: string
    payment_id?: string
    status?: string
    collection_status?: string
  }>
}

export default async function ReportePremiumDescargarPage({ searchParams }: PageProps) {
  const params = await searchParams
  const slugs = (params.slugs || '').split(',').filter(Boolean)
  const paymentId = params.payment_id
  const status = params.collection_status || params.status

  const downloadHref =
    paymentId && slugs.length > 0
      ? `/api/premium-report/pdf?payment_id=${encodeURIComponent(paymentId)}&slugs=${encodeURIComponent(slugs.join(','))}`
      : null

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      {status === 'approved' && downloadHref ? (
        <>
          <h1 className="font-display text-2xl font-bold text-neutral-900">¡Pago aprobado!</h1>
          <p className="mt-3 text-sm text-neutral-500">
            Tu reporte comparativo está listo. Si la descarga no arranca sola, tocá el botón de abajo — el link
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
            Mercado Pago todavía está procesando el pago (común con transferencias o pago en efectivo). En cuanto
            se acredite vas a poder volver a esta misma página con el link de descarga.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold text-neutral-900">No se completó el pago</h1>
          <p className="mt-3 text-sm text-neutral-500">
            No se acreditó ningún cobro. Podés volver al comparador e intentar de nuevo cuando quieras.
          </p>
        </>
      )}

      <div className="mt-8">
        <Link href="/comparar" className="link-underline text-sm text-neutral-500 hover:text-auto-accent">
          ← Volver al comparador
        </Link>
      </div>
    </div>
  )
}
