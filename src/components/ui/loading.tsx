import { cn } from '@/lib/utils'

/**
 * Primitivos de esqueleto compartidos para TODOS los estados de carga del
 * sitio (loading.tsx de rutas, fallbacks de `Suspense`, superficies de media
 * en imágenes). Regla de la auditoría de carga (2026-09): un skeleton debe
 * reproducir el layout REAL que está por reemplazar — nunca un bloque
 * genérico — para que no haya salto de layout ni una "otra pantalla" que
 * sorprenda al contenido real.
 *
 * Sin hooks, sin estado, sin 'use client': estos componentes solo se
 * renderizan desde Server Components y caen en árboles estáticos, así que
 * se pueden importar también desde fallbacks de `Suspense` del lado
 * servidor sin hinchar el bundle del cliente.
 */

/** Bloque base de esqueleto: superficie neutra + barrido de shimmer sutil
 *  (ver `.skeleton` en globals.css; `prefers-reduced-motion` lo congela a
 *  una superficie plana, conservando la estructura). De propósito, es un
 *  `<div aria-hidden>` individual por bloque: el contenedor loading que
 *  los agrupa ya informa el estado accesiblemente (ver `PendingIndicator`). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton', className)} />
}

/** Columna de texto placeholder — mismo ritmo tipográfico de la línea de
 *  descripción de `EntityCard`/filas de búsqueda (3-4px de alto, 2px de
 *  gap), con anchos opcionales por línea para simular recortes reales. */
export function SkeletonText({ lines = 3, widths }: { lines?: number; widths?: Array<string> }) {
  return (
    <div aria-hidden="true" className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', widths?.[i] ?? 'w-full')} />
      ))}
    </div>
  )
}

/** Esqueleto de `EntityCard` (layout `grid`, tamaño default): media 16:9 +
 *  badges + título + descripción + ficha técnica punteada + pie con CTA —
 *  misma estructura vertical y misma métrica de padding/gap que la card
 *  real (ver `src/components/entities/EntityCard.tsx`). */
export function EntityCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col overflow-hidden rounded-2xl border border-edge bg-surface-card">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none border-0" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <span className="inline-flex items-center gap-1.5">
            <Skeleton className="h-3 w-3 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-full" />
          </span>
        </div>
        <Skeleton className="h-7 w-3/4" />
        <SkeletonText lines={3} widths={['w-full', 'w-11/12', 'w-4/5']} />
        <div className="mt-1 grid grid-flow-col auto-cols-fr divide-x divide-edge border-y border-dashed border-edge-strong py-2.5">
          {[0, 1].map((col) => (
            <div key={col} className="min-w-0 space-y-1 px-3 first:pl-0">
              <Skeleton className="h-2 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-edge pt-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  )
}

/** Esqueleto de fila de resultados — mismo patrón de `SearchClient`
 *  (avatar 12x12 + línea de categoría + título + descripción, dentro de
 *  un bloque con divisores `divide-y`). */
export function SearchRowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-start gap-4 px-3 py-4">
      <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
      </div>
    </div>
  )
}

/** Esqueleto del tile selector del comparador (`VehiclePickerTile` en
 *  CompareExplorer): media 4:3 + título + fabricante. */
export function CompareTileSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border border-edge bg-surface-card">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none border-0" />
      </div>
      <div className="space-y-1.5 p-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  )
}

/** Esqueleto de la calculadora de financiamiento — misma estructura que
 *  `FinancingCalculator` (grid de campos → rows de resultado → bloque de
 *  lead con botón) para que el fallback del `Suspense` no colapse ni
 *  "salte" cuando hidrata el componente real. */
export function FinancingCalculatorSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-xl border border-edge bg-surface-card p-6 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2 border-t border-dashed border-edge-strong pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3 rounded-lg border border-edge bg-surface-card/60 p-4">
        <Skeleton className="h-4 w-3/4" />
        <SkeletonText lines={2} widths={['w-full', 'w-11/12']} />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

/** Indicador visual de que el filtro/búsqueda está "por aplicar" (trabajo
 *  pendiente durante el debounce de texto) — punto pulsante + etiqueta.
 *
 *  De acceso es deliberadamente visual (`aria-hidden`): la línea de
 *  resultados que lo acompaña YA es una región `aria-live="polite"` que
 *  anuncia el conteo nuevo cuando llega, así que anunciar además
 *  "Actualizando…" en cada tecla sería ruido duplicado para lectores de
 *  pantalla en vez de una señal nueva. */
export function PendingIndicator({ label = 'Actualizando…' }: { label?: string }) {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
      <span className="skeleton-live-dot" />
      {label}
    </span>
  )
}