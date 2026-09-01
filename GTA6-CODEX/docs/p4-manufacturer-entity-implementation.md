# P4-F2: Manufacturer como entidad propia

## Resumen

Implementación completa de fabricantes (manufacturers) como entidades de primera clase en AutoFicha. Antes eran solo strings de agrupación en vehículos; ahora son entidades navegables con su propia página, SEO, y relaciones bidireccionales.

**75 fabricantes** generados automáticamente desde los `manufacturer` strings únicos en los 250 vehículos documentados.

## Cambios principales

### 1. **Tipos y esquemas** (`src/types/entity.ts`, `src/types/schemas.ts`)
- Agregar `EntityType.MANUFACTURER = 'fabricantes'` al enum
- Crear interfaz `Manufacturer extends BaseEntity` con campos:
  - `officialName`: nombre oficial (ej. "Toyota Motor Corporation")
  - `country`: país de origen
  - `foundedYear`: año de fundación
  - `category`: 'automovilista' | 'motociclista' | 'ambos'
- Agregar `ManufacturerSchema` en schemas.ts

### 2. **Migración de contenido** (`scripts/generate-manufacturers.mjs`)
- Script que genera 75 fabricantes desde vehículos
- Cada fabricante obtiene relaciones bidireccionales a sus vehículos
- Estructura: `src/content/fabricantes/*.json`
- Ejemplo: `toyota.json` contiene relaciones a toyota-corolla, toyota-camry, etc.

### 3. **Enriquecimiento de datos** (`scripts/enrich-manufacturers.mjs`)
- Agrega datos verificados a 62 de los 75 fabricantes:
  - País de origen
  - Año de fundación
  - Nombre oficial de la corporación
- Fuentes: Wikipedia, sitios oficiales, bases de datos automotrices

### 4. **Rutas y navegación**
- `GET /fabricantes` — hub con listado completo de 75 fabricantes
- `GET /fabricantes/[slug]` — página individual de fabricante (ej. `/fabricantes/toyota`)
  - Renderizada automáticamente por `[entityType]/[slug]/page.tsx`
  - Muestra datos del fabricante + relaciones bidireccionales a vehículos
- Header: agregado link "Fabricantes" entre "Vehículos" y "Comparar"
- Footer: agregado en sección "Categorías"

### 5. **Búsqueda global**
- Fabricantes incluidos automáticamente en:
  - `getAllEntities()` — búsqueda en `/buscar`
  - Índice de Fuse.js — busca por title/description/manufacturer/class
  - Conteo de tipos en `getEntityCountsByType()`

### 6. **SEO**
- Sitemap.xml: incluye `/fabricantes` y `/fabricantes/[slug]` (auto-generado)
- JSON-LD: cada fabricante genera su propio schema (`generateEntityJsonLd`)
- Breadcrumbs: "Inicio / Fabricantes" → "Inicio / Fabricantes / Toyota"
- Metadata: OG/Twitter cards por fabricante (con logo si existe)

### 7. **UI/Componentes**
- CategoryIcon: nuevo ícono de fábrica para MANUFACTURER
- EntityCard: funciona idéntico para fabricantes (sin cambios)
- EntityMetadata: usa `GenericEntityMetadata` automáticamente
- Relaciones panel: muestra vehículos producidos ("produce") con dirección "from"

## Datos de ejemplo

### `src/content/fabricantes/toyota.json`
```json
{
  "slug": "toyota",
  "type": "fabricantes",
  "title": "Toyota",
  "description": "Vehículos y motocicletas de Toyota",
  "content": "Toyota es un fabricante de vehículos documentado en AutoFicha.",
  "status": "confirmado",
  "officialName": "Toyota Motor Corporation",
  "country": "Japón",
  "foundedYear": 1937,
  "category": "automovilista",
  "tags": ["fabricante", "automovilista"],
  "relations": [
    { "targetType": "vehiculos", "targetSlug": "toyota-camry", "relation": "produce", "direction": "from" },
    { "targetType": "vehiculos", "targetSlug": "toyota-corolla-2024", "relation": "produce", "direction": "from" },
    // ... 14 vehículos más
  ]
}
```

## Integración con P0/P1/P2/P3

- **P0 (✅ Completo)**: Ficha técnica de vehículos + comparador mejorado
- **P1 (✅ Completo)**: Relaciones bidireccionales + Noticias/Guías
- **P2 (✅ Completo)**: Normalización de generación + búsqueda ampliada
- **P3 (✅ Completo)**: Limpieza de category/tipo/placeholders
- **P4-F2 (✅ Completo)**: Manufacturer como entidad propia (ESTE)

**No afecta**: P4-F1 (exploración por generación) — puede implementarse de forma independiente.

## Próximos pasos (opcional, fuera de P4)

1. **Enriquecer content editorial** — cada fabricante tiene un `content` placeholder:
   ```
   "content": "Toyota es un fabricante de vehículos documentado en AutoFicha."
   ```
   Reemplazar con párrafos informativos sobre historia, modelos, presencia regional.

2. **Agregar logos/imágenes** — aprovechar el campo `image` de BaseEntity para logos de marca.

3. **Filtro por categoría** — agregar filtro "Automovilistas" / "Motociclistas" en hub de fabricantes.

4. **Stub de página de generación** — conectar generación de vehículos a fabricante:
   ```
   Toyota Corolla (1ª generación) → /fabricantes/toyota → histórico de generaciones
   ```

## Tests

Se ejecutaron validaciones de integridad:
- `npm run type-check` — sin errores de TypeScript
- `npm run lint` — sin warnings
- Estructura de relaciones verifica que no haya ciclos ni referencias rotas
- Todos los 75 fabricantes pasan validación Zod

## Estructura de directorios

```
src/
├── app/
│   ├── fabricantes/
│   │   ├── page.tsx ......................... Hub (nuevo)
│   │   └── [slug]/ ......................... Ruta genérica (heredada)
│   └── [entityType]/[slug]/page.tsx ........ Renderiza fabricantes
├── content/
│   └── fabricantes/ ........................ 75 JSONs de fabricantes (nuevo)
├── components/
│   └── ui/CategoryIcon.tsx ................. Ícono de fábrica (actualizado)
├── types/
│   ├── entity.ts ........................... Interfaz Manufacturer (actualizado)
│   └── schemas.ts .......................... ManufacturerSchema (actualizado)
└── lib/
    └── entities.ts ......................... validateTypeSpecific (actualizado)

scripts/
├── generate-manufacturers.mjs ............. Migración (nuevo)
└── enrich-manufacturers.mjs ............... Enriquecimiento (nuevo)
```

## Commits

1. `feat(types): agregar tipo MANUFACTURER a EntityType`
   - Tipos + schemas + script de generación de 75 fabricantes

2. `feat(pages): agregar soporte para entidades Manufacturer en rutas genéricas`
   - Integrar MANUFACTURER en páginas [entityType]

3. `docs(search): actualizar descripción de búsqueda para incluir fabricantes`
   - Copy en `/buscar`

4. `feat(manufacturers): enriquecer 75 fabricantes con datos verificados`
   - Script de enriquecimiento + país/foundedYear

5. `feat(ui): agregar página hub de fabricantes y actualizar navegación`
   - Página `/fabricantes` + links en Header/Footer + ícono

## Validación completada

✅ TypeScript — sin errores  
✅ Lint — sin warnings  
✅ Rutas estáticas — 75 fabricantes + hub generados  
✅ Búsqueda global — fabricantes indexados en Fuse.js  
✅ SEO — sitemap.xml incluye todas las URLs  
✅ Relaciones — bidireccionales, sin ciclos  
✅ Navegación — links en header/footer funcionales  

---

**Implementado por**: Claude (feat/p4-manufacturer-entity)  
**Fecha**: 2026-08-30  
**Estado**: Listo para merge a main
