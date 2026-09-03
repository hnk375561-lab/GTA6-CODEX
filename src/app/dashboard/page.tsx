import type { Metadata } from 'next'
import { SITE_NAME } from '@/config/site'
import {
  getRevenueLog,
  getTotalRevenue,
  getRevenueBySource,
  getRevenueByMonth,
  SOURCE_LABELS,
  type RevenueSource,
} from '@/lib/revenue'

// No indexar nunca esta ruta — aunque está detrás de Basic Auth (ver
// middleware.ts), un `noindex` es una segunda capa de defensa contra que
// Google la trate como página pública.
export const metadata: Metadata = {
  title: `Dashboard | ${SITE_NAME}`,
  robots: { index: false, follow: false },
}

// Se recalcula en cada visita (no generateStaticParams / no cache): son
// pocos KB de JSON local, no vale la pena una capa de caching para esto,
// y la persona que mira el dashboard quiere el dato recién cargado, no
// uno de un build viejo.
export const dynamic = 'force-dynamic'

const SOURCE_COLORS: Record<RevenueSource, string> = {
  adsense: 'bg-[#3aa5ff]',
  'afiliado-olx': 'bg-[#ffd166]',
  'afiliado-meli': 'bg-[#ffe600]',
  'afiliado-seguro': 'bg-[#34d399]',
  'afiliado-financiacion': 'bg-[#38bdf8]',
  'publicidad-directa': 'bg-[#ff5c8a]',
  'lead-cotizacion': 'bg-[#a78bfa]',
  'ficha-destacada': 'bg-[#fb923c]',
  'licencia-datos': 'bg-[#22d3ee]',
  otro: 'bg-auto-text-secondary',
}

function formatArs(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function DashboardPage() {
  const entries = getRevenueLog()
  const total = getTotalRevenue(entries)
  const bySource = getRevenueBySource(entries)
  const byMonth = getRevenueByMonth(entries)
  const maxSourceValue = Math.max(1, ...Object.values(bySource))

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-auto-text sm:text-3xl">
          Dashboard de <span className="text-gradient-vice">monetización</span>
        </h1>
        <p className="mt-2 text-sm text-auto-text-secondary sm:text-base">
          Ingresos cargados a mano en <code>revenue-log.json</code>. Este panel no reemplaza los
          paneles oficiales — es un solo lugar para ver todo junto sin abrir 4 pestañas.
        </p>
      </div>

      {/* Total */}
      <div className="mb-8 rounded-xl border border-auto-border bg-auto-surface p-6">
        <p className="text-sm text-auto-text-secondary">Total acumulado registrado</p>
        <p className="mt-1 font-display text-4xl font-bold text-auto-text">{formatArs(total)}</p>
        <p className="mt-1 text-xs text-auto-text-secondary">{entries.length} entradas cargadas</p>
      </div>

      {/* Por fuente */}
      <div className="mb-8 rounded-xl border border-auto-border bg-auto-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-auto-text">Por fuente</h2>
        <div className="space-y-3">
          {(Object.keys(SOURCE_LABELS) as RevenueSource[]).map((source) => (
            <div key={source}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-auto-text-secondary">{SOURCE_LABELS[source]}</span>
                <span className="font-medium text-auto-text">{formatArs(bySource[source])}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-auto-border">
                <div
                  className={`h-full rounded-full ${SOURCE_COLORS[source]}`}
                  style={{ width: `${(bySource[source] / maxSourceValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Por mes */}
      {byMonth.length > 0 && (
        <div className="mb-8 rounded-xl border border-auto-border bg-auto-surface p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-auto-text">Por mes</h2>
          <div className="space-y-2">
            {byMonth.map(({ mes, total: mesTotal }) => (
              <div key={mes} className="flex justify-between text-sm">
                <span className="text-auto-text-secondary">{mes}</span>
                <span className="font-medium text-auto-text">{formatArs(mesTotal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="mb-8 overflow-x-auto rounded-xl border border-auto-border bg-auto-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-auto-text">
          Historial completo
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-auto-text-secondary">
            Todavía no hay entradas. Instrucciones para cargar la primera en{' '}
            <code>src/content/monetizacion/README.md</code>.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-auto-border text-auto-text-secondary">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Fuente</th>
                <th className="py-2 pr-4">Monto</th>
                <th className="py-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={i} className="border-b border-auto-border/60 text-auto-text">
                  <td className="py-2 pr-4 whitespace-nowrap">{entry.fecha}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{SOURCE_LABELS[entry.fuente]}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatArs(entry.montoArs)}</td>
                  <td className="py-2 text-auto-text-secondary">{entry.nota ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Links a paneles oficiales */}
      <div className="rounded-xl border border-auto-border bg-auto-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-auto-text">
          Paneles oficiales (fuente real de cada número)
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              className="text-auto-accent underline"
              href="https://www.google.com/adsense/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AdSense — ingresos por ads
            </a>
          </li>
          <li>
            <a
              className="text-auto-accent underline"
              href="https://analytics.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics (GA4) — tráfico, clicks de afiliados (eventos)
            </a>
          </li>
          <li>
            <a
              className="text-auto-accent underline"
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
            >
              Search Console — qué keywords traen tráfico
            </a>
          </li>
          <li>
            <a
              className="text-auto-accent underline"
              href="https://vercel.com/analytics"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel Analytics — tráfico en tiempo real
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
