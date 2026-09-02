/**
 * Estado de carga del listado de entidades (`/personajes`, `/vehiculos`,
 * etc.). Convención nativa del App Router: Next lo muestra automáticamente
 * mientras el Server Component de `page.tsx` resuelve datos, sin JS
 * adicional ni estado manual. Grid de placeholders con la misma métrica
 * (gap, columnas) que `EntityCard` para que no haya salto de layout al
 * llegar el contenido real.
 */
export default function Loading() {
  return (
    <div className="container-max py-16">
      <div className="mb-10 h-10 w-64 animate-pulse rounded-lg bg-edge/60" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[16/9] animate-pulse rounded-xl bg-edge/60"
          />
        ))}
      </div>
    </div>
  )
}
