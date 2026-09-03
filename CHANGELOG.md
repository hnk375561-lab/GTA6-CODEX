# 📝 Changelog — Rediseño del Hero

## Resumen de cambios

**Versión:** Hero Redesign Sept 2026  
**Fecha:** 2026-09-03  
**Ámbito:** Componentes del hero + page.tsx  

### Archivos modificados:
1. ✅ `src/app/page.tsx` (actualizado)
2. ➕ `src/components/home/HeroPromoBanner.tsx` (NUEVO)
3. ➕ `src/components/home/HeroVehicleShowcaseV2.tsx` (NUEVO)

### Archivos que dejan de usarse (opcional eliminar):
- 🗑️ `src/components/home/HeroSelfPromoCard.tsx` (reemplazado)
- 🗑️ `src/components/home/HeroVehicleShowcase.tsx` (reemplazado)

---

## Detalle de cambios por archivo

### 1️⃣ `src/app/page.tsx`

#### Importes (líneas 37-38)
```diff
- import { HeroVehicleShowcase, type HeroVehicleShowcaseItem } from '@/components/home/HeroVehicleShowcase'
- import { type HeroSelfPromoContent } from '@/components/home/HeroSelfPromoCard'
+ import { HeroVehicleShowcaseV2, type HeroVehicleShowcaseItem } from '@/components/home/HeroVehicleShowcaseV2'
+ import { type HeroPromoBannerItem } from '@/components/home/HeroPromoBanner'
```

#### Lógica del anuncio promocional (líneas ~267-334)
**ANTES:** Construía un array `heroSelfPromoItems` con 2-3 recomendaciones verticales (columna)
```typescript
const HERO_SELF_PROMO_CATEGORY_ORDER = ['Sedán', 'SUV', 'Pickup', 'Deportivo', 'Hatchback', 'Familiar'] as const
const HERO_SELF_PROMO_LIMIT = 3
const heroShowcaseSlugs = new Set(heroShowcaseVehicles.map((item) => item.slug))

function buildSelfPromoContent(vehicle: Vehicle, categoryLabel: string): HeroSelfPromoContent | null {
  // ... lógica de construcción ...
}

const usedSelfPromoSlugs = new Set(heroShowcaseSlugs)
const heroSelfPromoItems: HeroSelfPromoContent[] = []
for (const category of HERO_SELF_PROMO_CATEGORY_ORDER) {
  // ... loop de categorías ...
}
// ... relleno hasta 2 ítems mínimo ...
```

**DESPUÉS:** Construye un único `heroPromoBannerItem` (tarjeta grande)
```typescript
const heroShowcaseSlugs = new Set(heroShowcaseVehicles.map((item) => item.slug))

const heroPromoBannerItem: HeroPromoBannerItem | null = (() => {
  const candidate = featured.find((v) => {
    if (heroShowcaseSlugs.has(v.slug)) return false
    const img = resolveEntityDisplayImage(v)
    return Boolean(img)
  })
  if (!candidate) return null
  const v = candidate as Vehicle
  const image = resolveEntityDisplayImage(candidate)!
  const powerHp = parsePowerHp(v)
  const priceUsd = parsePriceUsd(v)
  const category = getVehicleCategory(v.class) ?? 'vehículo'
  return {
    eyebrow: `Por qué elegir un ${category.toLowerCase()}`,
    headline: v.manufacturer ? `${v.manufacturer} ${v.title}` : v.title,
    description: v.description || null,
    src: image.src,
    alt: image.alt,
    detailHref: `/${EntityType.VEHICLE}/${candidate.slug}`,
    powerLabel: powerHp !== null ? `${powerHp} hp` : null,
    secondaryStatLabel: priceUsd !== null ? formatUsdShort(priceUsd) : (v.performance?.speed ?? null),
    evidenceLevel: v.evidence?.level,
  }
})()
```

**Cambio conceptual:**
- Antes: Función `buildSelfPromoContent()` + loop de categorías + fallback
- Después: IIFE (Immediately Invoked Function Expression) que retorna 1 ítem o `null`
- Beneficio: Más simple, más directo, sin estado acumulado

#### Renderizado del hero (línea ~559)
```diff
- <HeroVehicleShowcase vehicles={heroShowcaseVehicles} selfPromoItems={heroSelfPromoItems} />
+ <HeroVehicleShowcaseV2 vehicles={heroShowcaseVehicles} promoBannerItem={heroPromoBannerItem} />
```

**Props que cambian:**
- `selfPromoItems` (array) → `promoBannerItem` (single item or null)

---

### 2️⃣ `src/components/home/HeroPromoBanner.tsx` (NUEVO)

**Tipo:** Client component (`'use client'`)

**Exports:**
```typescript
export interface HeroPromoBannerItem {
  eyebrow: string
  headline: string
  description?: string | null
  src: string
  alt: string
  detailHref: string
  powerLabel?: string | null
  secondaryStatLabel?: string | null
  evidenceLevel?: EvidenceLevel
}

export function HeroPromoBanner({ item, className }: HeroPromoBannerProps)
```

**Características principales:**
- 📦 Un único `HeroPromoBannerItem` (o `null` para fallback)
- 🎨 Tarjeta grande con foto + detalles lado a lado (desktop)
- 📱 Responsivo: apila en mobile (foto arriba, detalles abajo)
- 🔗 Un solo `<Link>` — todo es clickeable
- ✨ Sello de evidencia en esquina superior izquierda
- 📊 Chip de specs (potencia + precio) en esquina inferior izquierda
- 💫 Animación de entrada suave (`animate-fade-in`)
- 🎯 Fallback genérico cuando no hay ítem

**Layout:**
```
Desktop (lg+):
┌─────────────────────────────────────┐
│ FOTO (50%)  │  DETALLES (50%)       │
│             │  - Eyebrow            │
│             │  - Título             │
│             │  - Descripción        │
│             │  - CTA                │
└─────────────────────────────────────┘

Mobile (<lg):
┌───────────────────────────────────────┐
│ FOTO (100%, auto height)              │
├───────────────────────────────────────┤
│ DETALLES (100%)                       │
│ - Eyebrow                             │
│ - Título                              │
│ - Descripción                         │
│ - CTA                                 │
└───────────────────────────────────────┘
```

**Clases Tailwind clave:**
- `rounded-3xl`: esquinas grandes
- `border border-neutral-200`: borde sutil
- `bg-neutral-900 text-white`: fondo oscuro
- `lg:flex-row lg:items-stretch`: layout horizontal en desktop
- `group-hover:text-white`: interacción al hover

---

### 3️⃣ `src/components/home/HeroVehicleShowcaseV2.tsx` (NUEVO)

**Tipo:** Client component (`'use client'`)

**Exports:**
```typescript
export interface HeroVehicleShowcaseItem {
  slug: string
  title: string
  manufacturer?: string
  src: string
  alt: string
  categoryHref?: string | null
  detailHref: string
  powerLabel?: string | null
  secondaryStatLabel?: string | null
  evidenceLevel?: EvidenceLevel
}

export function HeroVehicleShowcaseV2({ vehicles, promoBannerItem, className }: HeroVehicleShowcaseV2Props)
```

**Props que cambian respecto a `HeroVehicleShowcase` anterior:**
```diff
- selfPromoItems: HeroSelfPromoContent[]
+ promoBannerItem: HeroPromoBannerItem | null
```

**Estructura de componentes:**
```
HeroVehicleShowcaseV2
├── div.flex (franja principal)
├── div (bloque izquierdo, 50% en desktop)
│   └── HeroPromoBanner (tarjeta grande)
└── section (bloque derecho, 50% en desktop)
    ├── FeaturedCarousel
    │   ├── (4+ cards de vehículos)
    │   └── (con specs, evidencia, CTA)
    ├── button (flecha prev, desktop only)
    └── button (flecha next, desktop only)
```

**Features:**
- 🔄 Track scroll con `useRef` + `updateScrollButtons()`
- ➡️ Flechas clickeables (solo desktop: `sm:flex`)
- 🖐️ Drag/swipe soportado por `FeaturedCarousel`
- ✨ Transición FLIP opcional (si soportada + no reduced-motion)
- 📐 Layout 50/50 en desktop (`lg:w-1/2` each)
- 📱 Stack vertical en mobile
- ♿ Accesibilidad: aria-labels, imágenes con `aria-hidden`

**Responsividad (Tailwind breakpoints):**
```
mobile (<sm):     1 col, gap-4, flechas hidden
tablet (sm-lg):   1 col, gap-4, flechas visible
desktop (lg+):    2 cols, gap-4, flechas visible
```

**Padding horizontal:**
```typescript
px-3 sm:px-4  // Mínimo padding para "edge-to-edge" visual
```

---

## Cambios visuales en el navegador

### ANTES:
```
┌─────────────────────────────────────────────────┐
│         HERO CON FOTO FLOTANTE                  │
│  [Foto superpuesta]                             │
│  Título + CTAs + Buscador                       │
│  [Pequeña columna de recomendaciones]           │
│  [Carrusel de vehículos]                        │
│                                                 │
│ Categorías                                      │
└─────────────────────────────────────────────────┘
```

### DESPUÉS:
```
┌─────────────────────────────────────────────────┐
│         HERO TÍTULO Y BUSCA                      │
│  Título + CTAs + Buscador                       │
│                                                 │
│  FRANJA 100% HORIZONTAL:                        │
│  ┌───────────────────┬──────────────────────┐  │
│  │ PROMO GRANDE      │ CARRUSEL             │  │
│  │ (foto + detalles) │ [vehicle] [vehicle]  │  │
│  │ (1 ítem fijo)     │ [vehicle] [vehicle]  │  │
│  │                   │ ← flechas clickables │  │
│  └───────────────────┴──────────────────────┘  │
│                                                 │
│ Categorías                                      │
└─────────────────────────────────────────────────┘
```

---

## Impacto en performance

### Antes:
- Array de 2-3 `HeroSelfPromoContent` items → 2-3 renders pequeños
- Carrusel independiente → scroll handling separado
- Foto flotante (canvas o img) → overlay management

### Después:
- 1 solo `HeroPromoBannerItem` → renderiza 1 tarjeta grande
- Carrusel igual → mismo scroll handling
- Sin foto flotante → simplificación de z-index/overlay
- **Reducción neta:** menos DOM nodes en el hero

### LCP (Largest Contentful Paint):
- Ambas versiones priorizan la primera imagen con `priority={true}`
- No hay cambio en LCP esperado

---

## Breaking Changes

### ⚠️ Para quien use el repo directamente

Si importabas `HeroVehicleShowcase` o `HeroSelfPromoCard` en otros archivos:
- **Busca:** `grep -r "HeroVehicleShowcase\|HeroSelfPromoCard" src/`
- **Reemplaza** las importaciones o elimina los archivos

Estos componentes viejos **ya no están importados** en `page.tsx`.

---

## Checklist de instalación

- [ ] Copiar `HeroPromoBanner.tsx` → `src/components/home/`
- [ ] Copiar `HeroVehicleShowcaseV2.tsx` → `src/components/home/`
- [ ] Reemplazar `page.tsx` → `src/app/`
- [ ] Correr `npm run type-check` (debe pasar sin errores)
- [ ] Correr `npm run dev` y verificar en http://localhost:3000
- [ ] Probar clicks en la promo izquierda
- [ ] Probar flechas carrusel derecha (solo desktop)
- [ ] Probar responsive en mobile
- [ ] Verificar que no hay errores de consola (F12)
- [ ] (Opcional) Eliminar viejos archivos si decidiste no mantenerlos

---

## Referencias en el código

### Comentarios en `HeroPromoBanner.tsx`
- Línea ~35: "REDISEÑO NUEVO"
- Línea ~40: Explica layout y características

### Comentarios en `HeroVehicleShowcaseV2.tsx`
- Línea ~54: "REDISEÑO COMPLETO"
- Línea ~58-67: Explica estructura new vs old

### Comentarios en `page.tsx`
- Línea ~267: "Anuncio propio del hero (NUEVO DISEÑO)"
- Línea ~273: Explica selección del único ítem

---

## Rollback (si algo sale mal)

Si necesitas volver a la versión anterior:

```bash
# Restaurar archivos viejos desde backup
git checkout HEAD -- src/app/page.tsx
git checkout HEAD -- src/components/home/HeroVehicleShowcase.tsx src/components/home/HeroSelfPromoCard.tsx

# O si no usas git:
# Restaura el page.tsx anterior manualmente desde tu backup
```

---

**Fin del changelog.**
