import type { Metadata } from 'next'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'
import mediaKitData from '../../../prospeccion/media-kit-data.json'

/**
 * Licencia de datos B2B — canal de monetización nuevo, separado de
 * "anunciate" (que vende espacio publicitario a negocios locales).
 *
 * Acá el producto es distinto: no es un banner, es el dataset en sí.
 * `src/content/vehiculos/` son 250 fichas con specs verificadas y fuente
 * citada por dato (ver README → "niveles de evidencia") — eso es un
 * activo con valor propio para cualquiera que necesite datos de
 * vehículos estructurados y no quiera armar/mantener esa base desde
 * cero: aseguradoras (tasación), tasadoras, comparadores de seguros,
 * concesionarias con su propio sitio, otros medios del rubro.
 *
 * No hay API real todavía (ver "Cómo funciona hoy" más abajo) — la
 * página es la puerta de entrada comercial; el delivery real (CSV /
 * export puntual por mail) es manual hasta que haya demanda real que
 * justifique construir un endpoint autenticado.
 */
const WHATSAPP_NUMBER = mediaKitData.contacto.telefono.replace(/[^\d]/g, '')
const WHATSAPP_MESSAGE = encodeURIComponent(
  `Hola, vi la página de licencia de datos de ${SITE_NAME} y quiero más info.`
)
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`

export const metadata: Metadata = {
  title: `Licencia de datos de vehículos | ${SITE_NAME}`,
  description:
    'Acceso a la base de datos de fichas técnicas verificadas de Sin Frenos: specs, precios y evidencia citada, en CSV/JSON para aseguradoras, tasadoras y desarrolladores.',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/licencia-datos` },
}

const PLANES = [
  {
    nombre: 'Export puntual',
    descripcion: 'Un CSV/JSON con las fichas que necesites (por marca, categoría o el catálogo completo) en un pago único.',
    precio: 'Desde ARS 15.000',
  },
  {
    nombre: 'Actualización mensual',
    descripcion: 'El mismo export, pero actualizado todos los meses a medida que sumamos o corregimos fichas. Ideal para tasadoras/comparadores que necesitan datos vigentes.',
    precio: 'Desde ARS 8.000/mes',
  },
  {
    nombre: 'Acceso API (a demanda)',
    descripcion: 'Si tu volumen de consultas lo justifica, armamos un endpoint autenticado en vez de exports manuales. Se cotiza según volumen esperado.',
    precio: 'A cotizar',
  },
]

export default function LicenciaDatosPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal>
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3 text-xs font-semibold uppercase tracking-wide text-auto-accent-strong">
            Para desarrolladores y empresas del rubro
          </p>
          <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
            Licenciá nuestra <span className="text-gradient-vice">base de datos de vehículos</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">
            {mediaKitData.trafico.fichasPublicadas} fichas técnicas de {mediaKitData.trafico.fichasPublicadas ? '75+' : ''} fabricantes, cada
            dato con fuente citada y nivel de confianza explícito. Si necesitás datos de vehículos
            estructurados y confiables para tu producto — tasación de seguros, comparador propio,
            calculadora de financiación, catálogo de una concesionaria — no hace falta que arms esa
            base desde cero.
          </p>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="mb-10 grid gap-4 rounded-xl border border-edge bg-surface-card p-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Casos de uso típicos</p>
            <p className="mt-1 text-sm text-neutral-600">Tasación / seguros, comparadores, financiación, catálogos propios</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Formato</p>
            <p className="mt-1 text-sm text-neutral-600">CSV / JSON, o API a demanda</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Cobertura</p>
            <p className="mt-1 text-sm text-neutral-600">Autos, SUVs, pickups y motos — 75+ fabricantes globales</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <h2 className="mb-4 font-display text-lg font-semibold text-neutral-900">Planes</h2>
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {PLANES.map((plan) => (
            <div
              key={plan.nombre}
              className="flex flex-col rounded-xl border border-edge bg-surface-card p-5 transition-colors hover:border-auto-accent"
            >
              <h3 className="font-display text-base font-semibold text-neutral-900">{plan.nombre}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">{plan.descripcion}</p>
              <p className="mt-4 font-mono text-sm font-semibold text-auto-accent-strong">{plan.precio}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="mb-10 rounded-xl border border-edge bg-surface-alt p-6">
          <h2 className="mb-2 font-display text-base font-semibold text-neutral-900">Cómo funciona hoy</h2>
          <p className="text-sm leading-relaxed text-neutral-500">
            Todavía no hay un endpoint público automatizado — el delivery es manual (te mandamos el
            export por mail) hasta que el volumen de pedidos justifique construir una API con
            autenticación por API key. Escribinos contando qué necesitás y te confirmamos si lo
            tenemos cubierto con lo que ya existe en el catálogo.
          </p>
        </div>
      </Reveal>

      <Reveal delay={180}>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-edge bg-auto-darker p-8 text-center">
          <p className="font-display text-lg font-semibold text-white">¿Charlamos sobre tu caso de uso?</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-scale mt-2 inline-flex items-center gap-2 rounded-lg bg-auto-accent px-6 py-3 font-display text-sm font-semibold text-auto-darker transition-transform hover:scale-105"
          >
            Escribinos por WhatsApp
          </a>
          <a
            href="mailto:uruspotcdu@gmail.com?subject=Licencia%20de%20datos%20-%20Sin%20Frenos"
            className="link-underline text-xs text-neutral-400 hover:text-neutral-200"
          >
            o escribinos por mail
          </a>
        </div>
      </Reveal>
    </div>
  )
}
