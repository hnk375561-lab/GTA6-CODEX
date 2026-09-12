# P1-06 Implementation Guide: Distinguir Contenido Editorial de Fichas Técnicas

## Problema

El auditor reportó:

> "El límite entre 'ficha técnica verificada' (el producto real) y 'contenido editorial' (artículos de opinión/mercado) no existe visualmente. Ambos comparten exactamente el mismo componente visual y el mismo sistema de confianza ('nivel de evidencia'), lo cual devalúa justo el diferencial que el proyecto dice tener."

**Impacto:** Los usuarios no pueden distinguir una guía/noticia de una ficha técnica verificada.

---

## Solución: ContentTypeBadge Component

Se incluye un nuevo componente: `src/components/entities/ContentTypeBadge.tsx`

### Qué Hace

Agrega un badge visual pequeño que identifica el tipo de contenido:

| Tipo | Badge | Color | Ubicación |
|------|-------|-------|-----------|
| Vehículos | "Ficha técnica" | 🟢 Verde (`archive-green`) | En EntityCard |
| Guías | "Guía editorial" | 🔴 Naranja (`oxide-red`) | En EntityCard |
| Noticias | "Noticia" | 🔴 Naranja (`oxide-red`) | En EntityCard |

### Componentes Disponibles

```tsx
import { ContentTypeBadge, ContentTypeBadgeConditional } from '@/components/entities/ContentTypeBadge'

// Opción 1: Mostrar siempre (máxima claridad)
<ContentTypeBadge entity={entity} />

// Opción 2: Solo para contenido editorial (menos visual clutter)
<ContentTypeBadgeConditional entity={entity} />

// Opción 3: Obtener el texto sin renderizar
import { getContentTypeLabel } from '@/components/entities/ContentTypeBadge'
const label = getContentTypeLabel(entity) // "Ficha técnica", "Guía editorial", etc.
```

---

## Cómo Integrar

### Paso 1: Copiar el Componente

```bash
cp sin-frenos-fixes/src/components/entities/ContentTypeBadge.tsx \
   tu-repo/src/components/entities/ContentTypeBadge.tsx
```

### Paso 2: Integrar en EntityCard.tsx

Ubicación: `src/components/entities/EntityCard.tsx`

Encuentra donde se renderiza el título/encabezado de la card (típicamente cerca de línea 50-100):

**Antes:**
```tsx
export function EntityCard({ entity, typeLabel, image, priority }: EntityCardProps) {
  return (
    <article className="...">
      <div className="...">
        <h3 className="text-lg font-bold">{entity.title}</h3>
        <p className="text-sm text-neutral-500">{entity.description}</p>
      </div>
    </article>
  )
}
```

**Después (Opción A: Siempre mostrar):**
```tsx
import { ContentTypeBadge } from '@/components/entities/ContentTypeBadge'

export function EntityCard({ entity, typeLabel, image, priority }: EntityCardProps) {
  return (
    <article className="...">
      <div className="...">
        {/* Badge nuevo */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold">{entity.title}</h3>
          <ContentTypeBadge entity={entity} />
        </div>
        <p className="text-sm text-neutral-500">{entity.description}</p>
      </div>
    </article>
  )
}
```

**Después (Opción B: Solo para contenido editorial):**
```tsx
import { ContentTypeBadgeConditional } from '@/components/entities/ContentTypeBadge'

export function EntityCard({ entity, typeLabel, image, priority }: EntityCardProps) {
  return (
    <article className="...">
      <div className="...">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold">{entity.title}</h3>
          <ContentTypeBadgeConditional entity={entity} />
        </div>
        <p className="text-sm text-neutral-500">{entity.description}</p>
      </div>
    </article>
  )
}
```

### Paso 3: Testear Localmente

```bash
cd tu-repo
npm run dev

# Abrí http://localhost:3000/vehiculos
# Deberías ver los badges en las cards
```

---

## Diseño & Colores

Los badges usan la paleta del sitio:

```css
/* Verde (fichas técnicas verificadas) */
--color-archive-green: #2B4436
--bg-archive-green-10: rgba(43, 68, 54, 0.1)

/* Rojo (contenido editorial) */
--color-oxide-red: #B23A24
--bg-oxide-red-10: rgba(178, 58, 36, 0.1)
```

Si los colores no se aplican, verificá que `tailwind.config.js` tiene estas variables definidas:

```js
// tailwind.config.js
extend: {
  colors: {
    'archive-green': '#2B4436',
    'oxide-red': '#B23A24',
    // ...
  }
}
```

---

## Cambios Alternativos

Si no querés agregar un badge, alternativas menos invasivas:

### Opción 1: Diferenciar por Ícono

```tsx
// En EntityCard, cambiar el ícono según tipo
<div className="text-2xl">
  {entity.type === EntityType.VEHICLE ? '🚗' : 
   entity.type === EntityType.GUIDE ? '📖' : '📰'}
</div>
```

### Opción 2: Diferenciar por Borde/Estilo

```tsx
<article className={cn(
  'border-2',
  entity.type === EntityType.VEHICLE 
    ? 'border-archive-green' 
    : 'border-oxide-red'
)}>
  {/* ... */}
</article>
```

### Opción 3: Diferenciar por Fondo

```tsx
<article className={cn(
  'rounded-lg p-4',
  entity.type === EntityType.VEHICLE 
    ? 'bg-archive-green/5' 
    : 'bg-oxide-red/5'
)}>
  {/* ... */}
</article>
```

---

## Testing

### Test Visual

```bash
# Ver todas las guías (deberían mostrar "Guía editorial" en rojo)
http://localhost:3000/guias

# Ver todas las noticias (deberían mostrar "Noticia" en rojo)
http://localhost:3000/noticias

# Ver vehículos (deberían mostrar "Ficha técnica" en verde)
http://localhost:3000/vehiculos
```

### Test Accesibilidad

```bash
# Los badges deben ser leíbles por screen readers
# Verificá que el aria-hidden está solo en los dots decorativos:
<span aria-hidden="true">•</span>

# El texto "Guía editorial", "Noticia", etc. debe ser leíble
```

### Test Responsive

```bash
# Mobile (375px): Badge debe caber sin quebrar en dos líneas
# Tablet (768px): Layout normal
# Desktop (1024px): Layout normal
```

---

## Mantenimiento

Si en el futuro se agregan nuevos tipos de entidades:

1. Actualizar `getBadgeConfig()` en `ContentTypeBadge.tsx`
2. Agregar nuevos colores en `tailwind.config.js` si es necesario
3. Correr tests para verificar que no se rompió nada

---

## Documentación Relacionada

- **EntityCard.tsx** — Componente donde se agrega el badge
- **ContentTypeBadge.tsx** — Nuevo componente de badge
- **AUDITORIA_UX_RED_TEAM_BRUTAL.txt** — Reporte original (P1-06)

---

**Tiempo estimado de implementación:** 15 minutos  
**Complejidad:** Baja  
**Impacto visual:** Alto (mejora claridad del contenido)
