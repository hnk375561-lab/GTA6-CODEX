import { SearchRowSkeleton, Skeleton } from '@/components/ui/loading'

/**
 * Estado de carga de `/buscar`. La página que reemplaza este estado casi
 * siempre tiene `?q=` (se llega desde el buscador rápido de la home o un
 * deep-link) y muestra una lista de FILAS de resultados — por eso el
 * skeleton es input + lista de filas `SearchRowSkeleton`, no un grid.
 */
export default function Loading() {
  return (
    <div className="container-max py-16">
      <div className="mx-auto max-w-xl">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="mx-auto mt-6 max-w-3xl divide-y divide-edge rounded-xl border border-edge bg-surface-card px-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SearchRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}