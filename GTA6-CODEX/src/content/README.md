# Arquitectura de Contenido

Este directorio contiene todo el contenido estructurado de **AutoFicha**
(catálogo de vehículos). Está organizado por tipo de entidad.

> Nota histórica: este archivo describía hasta ahora el modelo de datos del
> proyecto anterior (una wiki de fans de GTA VI, con `personajes`,
> `misiones`, `armas`, etc.). Ese contenido nunca existió en este repo tras
> el pivote y el doc había quedado desactualizado. Lo que sigue refleja el
> modelo real usado por el código (`src/types/entity.ts` y
> `src/types/schemas.ts` son la fuente de verdad; este archivo es una guía
> de lectura rápida, no el contrato).

## Estructura

```
content/
├── vehiculos/        # 250 fichas técnicas de autos y motos (JSON)
├── noticias/         # Tipo habilitado en el código, sin contenido aún
└── guias/            # Tipo habilitado en el código, sin contenido aún
```

Los tres tipos de entidad válidos están definidos en el enum `EntityType`
(`src/types/entity.ts`): `vehiculos`, `noticias`, `guias`.

## Formato de archivo — vehículos

Cada vehículo es un JSON en `content/vehiculos/{slug}.json`. Campos reales
(tomado de una ficha existente, `audi-a4.json`):

```json
{
  "slug": "audi-a4",
  "type": "vehiculos",
  "title": "Audi A4",
  "description": "Sedán ejecutivo compacto de Audi, tracción quattro opcional.",
  "status": "confirmado",
  "manufacturer": "Audi",
  "class": "Sedán ejecutivo",
  "power": "201 hp aprox. (motor 2.0 TFSI, último año en EE.UU.)",
  "price": "Discontinuado en EE.UU. (2025); vigente en India/Europa",
  "mercados": ["Europa", "India", "Latinoamérica (incl. Argentina, México)"],
  "performance": { "speed": "241 km/h", "acceleration": "0-100 km/h en 7.3s" },
  "evidence": {
    "level": "respaldado",
    "primarySource": "https://www.cargurus.com/research/articles/...",
    "note": "Discontinuado en EE.UU. tras 2025; sigue vigente en otros mercados.",
    "limitations": ["Status varía fuertemente por mercado..."]
  }
}
```

El tipo `Vehicle` (`src/types/entity.ts`) define un set mínimo de campos
con forma fija (`manufacturer`, `class`, `power`, `performance`, etc.); el
resto de las claves que aparecen en los JSON reales (`transmision`,
`potenciaKW`, `equipamiento`, `colores`, `mercados`, etc.) son adicionales
y se validan de forma abierta, no contra un schema estricto — así una
ficha puede tener más o menos detalle sin romper el build.

`noticias` y `guias` no tienen un contrato TS propio más allá de
`BaseEntity` — son `GenericEntity`, con forma intencionalmente abierta
(ver `src/components/entities/EntityMetadata.tsx`, que renderiza sus
campos de forma data-driven).

## Campos base (`BaseEntity`, todo tipo de entidad)

| Campo | Obligatorio | Notas |
|---|---|---|
| `slug` | sí | único dentro del tipo |
| `type` | sí | `vehiculos` \| `noticias` \| `guias` |
| `title` | sí | |
| `description` | sí | |
| `status` | sí | `confirmado` \| `rumor` \| `nuestro` |
| `content` | no | texto largo opcional |
| `tags` | no | array de strings |
| `featured` | no | |
| `createdAt` / `updatedAt` | sí | ISO 8601 |
| `relations` | no | ver abajo |
| `seoTitle` / `seoDescription` | no | |
| `evidence` | no (fuertemente recomendado en `vehiculos`) | ver niveles abajo |
| `image` | no | procedencia de la imagen (`official` \| `secondary` \| `unverified`) |

## Niveles de evidencia (`evidence.level`)

Cada ficha declara qué tan sólida es la fuente de sus datos:

| Nivel | Significado |
|---|---|
| `oficial-nombrado` | Confirmado por ficha técnica oficial del fabricante |
| `oficial-visual` | Visible en material oficial, sin confirmación textual |
| `oficial-visual-multifuente` | Igual al anterior, con más de una fuente oficial |
| `respaldado` | Sin confirmación oficial directa, pero con fuentes secundarias solventes |
| `especulativo` | Rumor o estimación razonable, marcado como tal |

## Slug

El slug debe ser:
- Único dentro del tipo de entidad
- URL-safe (solo caracteres alfanuméricos, guiones, sin espacios)
- Descriptivo y SEO-friendly
- En minúsculas

### Ejemplos válidos:
- `audi-a4`
- `toyota-corolla-cross`
- `honda-cb500x`

### Ejemplos inválidos:
- `Audi A4` (espacios)
- `audi_a4` (guiones bajos)
- `AUDI-A4` (mayúsculas, aunque se aceptarían)
- `🚗-a4` (emojis)

## Relaciones

Las relaciones conectan entidades entre sí de forma consistente.

```json
"relations": [
  {
    "targetType": "vehiculos",
    "targetSlug": "audi-a5",
    "relation": "related_model",
    "direction": "bidirectional"
  }
]
```

`relation` es texto libre (no un enum cerrado); usar valores consistentes
entre fichas para que tenga sentido navegable (p. ej. `related_model`,
`same_manufacturer`, `same_platform`).

## Tags

Los tags son palabras clave para clasificación y búsqueda.

```json
"tags": ["sedan", "premium", "traccion-integral"]
```

## Añadir contenido nuevo

### 1. Crear archivo JSON

```bash
content/vehiculos/nuevo-modelo.json
```

### 2. Llenar con estructura base

```json
{
  "slug": "nuevo-modelo",
  "type": "vehiculos",
  "title": "Nombre del Modelo",
  "description": "Descripción breve",
  "status": "confirmado",
  "manufacturer": "Fabricante",
  "tags": [],
  "createdAt": "2026-08-28T00:00:00Z",
  "updatedAt": "2026-08-28T00:00:00Z",
  "relations": []
}
```

### 3. Completar información

Agregar `power`, `performance`, `evidence` (con fuente citada — es el
diferencial del proyecto), y cualquier campo adicional relevante.

### 4. Verificar

```bash
npm run verify:content    # Integridad del contenido
npm run verify:relations  # Relaciones entre entidades
npm run verify:seo        # Metadata SEO
npm run audit:evidence    # Cobertura de fuentes citadas
npm run type-check
```

## Contenido editorial (MDX)

Para `noticias` y `guias` (contenido más largo), usar MDX:

```bash
content/guias/como-elegir-un-sedan.mdx
```

```mdx
---
slug: como-elegir-un-sedan
type: guias
title: "Cómo elegir un sedán ejecutivo"
status: nuestro
tags: [guia, sedan, compra]
---

# Cómo elegir un sedán ejecutivo

Contenido...
```

## Validaciones automáticas

El build process valida:

✓ JSON válido
✓ Slug único por tipo
✓ Tipo de entidad válido (`vehiculos` \| `noticias` \| `guias`)
✓ `status` válido
✓ Campos obligatorios presentes
✓ Relaciones apuntan a entidades existentes
✓ Timestamps ISO válidos
✓ Cantidad mínima de vehículos (`verify:min-count` — evita repetir el bug
  de BOM UTF-8 que dejó el catálogo en 0 vehículos en producción con CI en
  verde, ver `README.md` raíz, sección "Estado del pivote")

Si alguno falla, el build se detiene y reporta el error.

## Generación automática de páginas

Cada archivo en `content/{type}/{slug}.json` (o `.mdx`) genera
automáticamente:

- Página en `/{type}/{slug}`
- Metadata SEO + Open Graph
- Breadcrumbs
- Enlaces relacionados
- Entrada en `sitemap.xml`
- Entrada en `robots.txt`

No se requiere crear archivos de rutas manualmente.
