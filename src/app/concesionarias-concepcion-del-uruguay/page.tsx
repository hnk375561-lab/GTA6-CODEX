import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'
import mediaKitData from '../../../prospeccion/media-kit-data.json'

/**
 * Directorio de negocios automotores de Concepción del Uruguay.
 *
 * Deliberadamente NO se puebla con los contactos de
 * `prospeccion/contactos-concepcion-del-uruguay.csv`: esos son leads de
 * prospección propia (muchos sin verificar, sin acuerdo comercial), no
 * clientes. Publicarlos gratis acá regalaría el mismo espacio que
 * `/anunciate` intenta vender — mataría el incentivo de pago. Los slots
 * quedan vacíos con un CTA de "reservar" hasta que un negocio real
 * confirme y pague; recién ahí se agrega su ficha a `LISTINGS` abajo.
 *
 * La página igual tiene valor sola: apunta a intención de búsqueda local
 * ("talleres Concepción del Uruguay", "concesionarias CDU") que hoy el
 * sitio no captura en ningún lado, y funciona como la landing a la que
 * apuntar en la prospección puerta a puerta / WhatsApp.
 */

type Rubro = 'concesionaria' | 'taller' | 'seguro' | 'repuestos' | 'gestoria' | 'neumaticos'

interface Listing {
  nombre: string
  rubro: Rubro
  descripcion: string
  telefono?: string
  direccion?: string
}

// Vacío hoy a propósito (ver nota arriba). Agregar acá cada negocio que
// confirme y pague — la UI ya soporta la mezcla de vacíos + reales.
const LISTINGS: Listing[] = []

const RUBROS: { key: Rubro; label: string }[] = [
  { key: 'concesionaria', label: 'Concesionarias' },
  { key: 'taller', label: 'Talleres mecánicos' },
  { key: 'seguro', label: 'Seguros' },
  { key: 'repuestos', label: 'Repuestos y accesorios' },
  { key: 'neumaticos', label: 'Gomerías y neumáticos' },
  { key: 'gestoria', label: 'Gestorías y trámites (transferencias, patentes)' },
]

const WHATSAPP_NUMBER = mediaKitData.contacto.telefono.replace(/[^\d]/g, '')
const WHATSAPP_MESSAGE = encodeURIComponent(
  'Hola, quiero reservar un espacio en el directorio de Sin Frenos para Concepción del Uruguay.'
)
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`

export const metadata: Metadata = {
  title: `Concesionarias y talleres en Concepción del Uruguay | ${SITE_NAME}`,
  description:
    'Directorio de concesionarias, talleres, seguros, repuestos, gomerías y gestorías para autos y motos en Concepción del Uruguay, Entre Ríos.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: `${SITE_URL}/concesionarias-concepcion-del-uruguay`,
  },
  openGraph: {
    type: 'website',
    title: `Concesionarias y talleres en Concepción del Uruguay | ${SITE_NAME}`,
    description:
      'Directorio de negocios automotores en Concepción del Uruguay: concesionarias, talleres, seguros, repuestos, gomerías y gestorías.',
    url: `${SITE_URL}/concesionarias-concepcion-del-uruguay`,
    siteName: SITE_NAME,
  },
}

function EmptySlotCard({ rubroLabel }: { rubroLabel: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="tap-scale flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-edge bg-surface-alt p-6 text-center transition-colors hover:border-auto-accent"
    >
      <span className="font-display text-sm font-semibold text-neutral-700">
        Este espacio de {rubroLabel.toLowerCase()} está libre
      </span>
      <span className="text-xs text-neutral-500">Tocá para reservarlo por WhatsApp</span>
    </a>
  )
}

export default function DirectorioConcepcionDelUruguayPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal>
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3 text-xs font-semibold uppercase tracking-wide text-auto-accent-strong">
            Concepción del Uruguay, Entre Ríos
          </p>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Concesionarias, talleres y seguros en{' '}
            <span className="text-gradient-vice">Concepción del Uruguay</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">
            El directorio de negocios automotores de la ciudad — concesionarias, talleres, seguros, repuestos,
            gomerías y gestorías — pensado para gente que ya está comparando fichas técnicas en {SITE_NAME} y
            busca dónde comprar, revisar o asegurar su próximo auto o moto cerca de casa.
          </p>
        </div>
      </Reveal>

      {RUBROS.map((rubro, i) => {
        const rubroListings = LISTINGS.filter((l) => l.rubro === rubro.key)
        return (
          <Reveal key={rubro.key} delay={60 + i * 40}>
            <section className="mb-10">
              <h2 className="mb-4 font-display text-lg font-semibold text-neutral-900">{rubro.label}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {rubroListings.map((listing) => (
                  <div key={listing.nombre} className="rounded-xl border border-edge bg-surface-card p-5">
                    <h3 className="font-display text-base font-semibold text-neutral-900">{listing.nombre}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-500">{listing.descripcion}</p>
                    {listing.direccion && (
                      <p className="mt-3 text-xs text-neutral-400">{listing.direccion}</p>
                    )}
                    {listing.telefono && (
                      <p className="text-xs text-neutral-400">{listing.telefono}</p>
                    )}
                  </div>
                ))}
                {/* Siempre al menos un slot vacío por rubro, como CTA de
                    venta — incluso si ya hay negocios reales cargados. */}
                <EmptySlotCard rubroLabel={rubro.label} />
              </div>
            </section>
          </Reveal>
        )
      })}

      <Reveal delay={260}>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-edge bg-auto-darker p-8 text-center">
          <p className="font-display text-lg font-semibold text-white">¿Tenés un negocio del rubro en la ciudad?</p>
          <p className="max-w-md text-sm text-neutral-300">
            Sumate al directorio y aparecé frente a gente que ya está comparando autos y motos antes de comprar.
            Ver planes y precios en{' '}
            <Link href="/anunciate" className="link-underline text-auto-accent">
              /anunciate
            </Link>
            .
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-scale mt-2 inline-flex items-center gap-2 rounded-lg bg-auto-accent px-6 py-3 font-display text-sm font-semibold text-auto-darker transition-transform hover:scale-105"
          >
            Reservar mi espacio
          </a>
        </div>
      </Reveal>
    </div>
  )
}
