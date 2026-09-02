interface EntitySectionHeadingProps {
  label: string
  /**
   * Índice editorial (01, 02...) mostrado antes del label. Es puramente
   * decorativo/tipográfico, pero se calcula en el llamador según qué
   * secciones realmente se renderizan en la ficha, para no mostrar saltos
   * (ej. "01" seguido de "03" si una sección intermedia no existe).
   * Si se omite, el encabezado no muestra número (uso en piezas cuya
   * posición relativa no es predecible, como la ficha técnica).
   */
  index?: number
}

/**
 * Encabezado de sección compartido por Evidencia, Relacionado, Información
 * y Ficha técnica. Reemplaza los <h2 className="font-bold"> sueltos por un
 * lenguaje tipográfico único (caps trackeadas + regla fina) consistente
 * con el eyebrow de clasificación del hero.
 */
export function EntitySectionHeading({ label, index }: EntitySectionHeadingProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {index != null && (
        <span className="font-mono text-[11px] tabular-nums text-auto-accent/70">
          {String(index).padStart(2, '0')}
        </span>
      )}
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-900">{label}</h2>
      <span className="h-px flex-1 bg-edge" aria-hidden="true" />
    </div>
  )
}
