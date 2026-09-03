import type { Metadata } from 'next'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'
import mediaKitData from '../../../prospeccion/media-kit-data.json'

/**
 * Página comercial "Anunciate con nosotros".
 *
 * Antes de esto, la propuesta de publicidad directa a negocios locales
 * (concesionarias, talleres, seguros) existía SOLO como PDF + templates de
 * email/WhatsApp en `prospeccion/` — nada de eso vivía en el sitio. Un
 * prospecto que googleaba "Sin Frenos" o entraba desde un mensaje de
 * WhatsApp no tenía dónde aterrizar para ver la propuesta por su cuenta.
 *
 * Esta página resuelve eso: lee las mismas `opcionesPublicidad` que ya se
 * usan para generar el media kit (`scripts/generate-media-kit.mjs` →
 * `prospeccion/media-kit-data.json`), así que actualizar precios o agregar
 * un plan nuevo es editar un solo JSON, no dos lugares.
 */

const WHATSAPP_NUMBER = mediaKitData.contacto.telefono.replace(/[^\d]/g, '')
const WHATSAPP_MESSAGE = encodeURIComponent(
  `Hola, vi la página de publicidad de ${SITE_NAME} y quiero más info.`
)
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`

export const metadata: Metadata = {
  title: `Anunciate en ${SITE_NAME} | Publicidad para negocios del rubro automotor`,
  description:
    'Espacios publicitarios en fichas técnicas, guías de compra y homepage para concesionarias, talleres y seguros. Audiencia con alta intención de compra.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: `${SITE_URL}/anunciate`,
  },
  openGraph: {
    type: 'website',
    title: `Anunciate en ${SITE_NAME}`,
    description:
      'Espacios publicitarios para negocios del rubro automotor. Audiencia con alta intención de compra.',
    url: `${SITE_URL}/anunciate`,
    siteName: SITE_NAME,
  },
}

export default function AnunciatePage() {
  const { trafico, audiencia, opcionesPublicidad, roiEjemplo } = mediaKitData

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal>
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3 text-xs font-semibold uppercase tracking-wide text-auto-accent-strong">
            Para negocios del rubro automotor
          </p>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Anunciá tu concesionaria, taller o seguro en{' '}
            <span className="text-gradient-vice">{SITE_NAME}</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">
            {audiencia.resumen} {audiencia.intencion}
          </p>
        </div>
      </Reveal>

      {/* Números actuales — mismos datos que el media kit, para que nadie
          reciba un número distinto por WhatsApp que el que ve acá. */}
      <Reveal delay={60}>
        <div className="mb-10 grid gap-4 rounded-xl border border-edge bg-surface-card p-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Fichas publicadas</p>
            <p className="mt-1 font-display text-xl font-semibold text-neutral-900">
              {trafico.fichasPublicadas}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Artículos publicados</p>
            <p className="mt-1 font-display text-xl font-semibold text-neutral-900">
              {trafico.articulosPublicados}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Tráfico</p>
            <p className="mt-1 text-sm text-neutral-600">{trafico.visitasMensuales}</p>
          </div>
        </div>
      </Reveal>

      {/* Planes — directo desde media-kit-data.json */}
      <Reveal delay={100}>
        <h2 className="mb-4 font-display text-lg font-semibold text-neutral-900">Opciones de publicidad</h2>
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {opcionesPublicidad.map((opcion) => (
            <div
              key={opcion.nombre}
              className="flex flex-col rounded-xl border border-edge bg-surface-card p-5 transition-colors hover:border-auto-accent"
            >
              <h3 className="font-display text-base font-semibold text-neutral-900">{opcion.nombre}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">{opcion.descripcion}</p>
              <p className="mt-4 font-mono text-sm font-semibold text-auto-accent-strong">
                ARS {opcion.precioMensualArs} / mes
              </p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="mb-10 rounded-xl border border-edge bg-surface-alt p-6">
          <h2 className="mb-2 font-display text-base font-semibold text-neutral-900">Por qué vale la pena</h2>
          <p className="text-sm leading-relaxed text-neutral-500">{roiEjemplo}</p>
        </div>
      </Reveal>

      <Reveal delay={180}>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-edge bg-auto-darker p-8 text-center">
          <p className="font-display text-lg font-semibold text-white">¿Charlamos 15 minutos?</p>
          <p className="max-w-md text-sm text-neutral-300">
            Contanos tu rubro y te armamos una propuesta con el espacio que más sentido tenga para tu negocio —
            sin compromiso.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-scale mt-2 inline-flex items-center gap-2 rounded-lg bg-auto-accent px-6 py-3 font-display text-sm font-semibold text-auto-darker transition-transform hover:scale-105"
          >
            Escribinos por WhatsApp
          </a>
          <a
            href="mailto:uruspotcdu@gmail.com?subject=Quiero%20anunciar%20en%20Sin%20Frenos"
            className="link-underline text-xs text-neutral-400 hover:text-neutral-200"
          >
            o escribinos por mail
          </a>
        </div>
      </Reveal>
    </div>
  )
}
