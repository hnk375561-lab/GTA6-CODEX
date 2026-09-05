import { EntityCardSkeleton, Skeleton } from '@/components/ui/loading'

/**
 * Estado de carga del listado de entidades (`/personajes`, `/vehiculos`,
 * etc.). Convención nativa del App Router: Next lo muestra automáticamente
 * mientras el Server Component de `page.tsx` resuelve datos, sin JS
 * adicional ni estado manual.
 *
 * El skeleton reproduce la estructura REAL de la página (breadcrumb → h1 →
 * grid de cards con la misma métrica de gap/columnas que la grilla de
 * `EntityCard`) para que no haya salto de layout al llegar el contenido.
 * Las columnas de la grilla mantienen la métrica previa (sm:2 lg:3 xl:4);
 * la variante exacta por tipo depende de datos que recién llegan después,
 * y este estado es efímero (SSG stream inmediato) — el mismatch se evita
 * en el fallback hidratable con grid type-aware (ver `[entityType]/page.tsx`).
 */
export default function Loading() {
  return (
    <div className="container-max py-16" role="status">
      <span className="sr-only">Cargando el listado…</span>
      <div className="mb-10" aria-hidden="true">
        <Skeleton className="mb-6 h-3.5 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <EntityCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}