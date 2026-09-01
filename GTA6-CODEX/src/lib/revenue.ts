import revenueLogRaw from '@/content/monetizacion/revenue-log.json'

export type RevenueSource =
  | 'adsense'
  | 'afiliado-olx'
  | 'afiliado-meli'
  | 'publicidad-directa'
  | 'otro'

export interface RevenueEntry {
  fecha: string
  fuente: RevenueSource
  montoArs: number
  nota?: string
}

export const SOURCE_LABELS: Record<RevenueSource, string> = {
  adsense: 'Google AdSense',
  'afiliado-olx': 'Afiliado OLX',
  'afiliado-meli': 'Afiliado Mercado Libre',
  'publicidad-directa': 'Publicidad directa',
  otro: 'Otro',
}

// El JSON importado no está tipado por defecto (queda como `any[]`); esta
// función es el único punto donde se hace el cast, para que el resto del
// código trabaje con RevenueEntry[] con seguridad de tipos.
export function getRevenueLog(): RevenueEntry[] {
  return (revenueLogRaw as RevenueEntry[]).slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
}

export function getTotalRevenue(entries: RevenueEntry[]): number {
  return entries.reduce((sum, e) => sum + e.montoArs, 0)
}

export function getRevenueBySource(entries: RevenueEntry[]): Record<RevenueSource, number> {
  const totals: Record<RevenueSource, number> = {
    adsense: 0,
    'afiliado-olx': 0,
    'afiliado-meli': 0,
    'publicidad-directa': 0,
    otro: 0,
  }
  for (const entry of entries) {
    totals[entry.fuente] += entry.montoArs
  }
  return totals
}

export function getRevenueByMonth(entries: RevenueEntry[]): { mes: string; total: number }[] {
  const byMonth = new Map<string, number>()
  for (const entry of entries) {
    const mes = entry.fecha.slice(0, 7) // YYYY-MM
    byMonth.set(mes, (byMonth.get(mes) ?? 0) + entry.montoArs)
  }
  return Array.from(byMonth.entries())
    .map(([mes, total]) => ({ mes, total }))
    .sort((a, b) => (a.mes < b.mes ? -1 : 1))
}
