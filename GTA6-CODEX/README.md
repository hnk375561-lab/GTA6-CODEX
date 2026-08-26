# 🚗 AutoFicha: Fichas Técnicas y Comparador de Autos y Motos

> **Un catálogo global de vehículos** con fichas técnicas reales, comparador
> lado a lado y una fuente citada detrás de cada dato.

<div align="center">

![Last Update](https://img.shields.io/badge/last%20update-August%202026-blue)
![Status](https://img.shields.io/badge/status-en%20pivote%20activo-orange)
![License](https://img.shields.io/badge/license-ver%20LICENSE-lightgrey)
![Node](https://img.shields.io/badge/node-18%2B-green)

[🌐 Sitio en vivo](https://autoficha.vercel.app) · [📖 Documentación](#-documentación) · [🚀 Quick Start](#-quick-start) · [🤝 Contribuir](#-contribuir)

</div>

> **📌 Este repo viene de un pivote.** Hasta agosto de 2026 este proyecto era
> una enciclopedia de fans sobre *Grand Theft Auto VI* ("GTA6 Zona"). Se
> descartó por completo esa idea y el repo se reconvirtió en **AutoFicha**:
> un catálogo real de vehículos, sin ninguna relación con Rockstar Games,
> Take-Two Interactive ni el juego. Quedan resabios de esa migración
> (nombres de archivo, tokens de diseño, contenido a limpiar) — están
> documentados en la sección [Estado del pivote](#-estado-del-pivote-qué-falta)
> para que cualquiera que entre al repo sepa exactamente qué es legado y qué
> es la dirección real del proyecto.

---

## 📋 Tabla de Contenidos

- [🎯 Visión](#-visión)
- [✨ Qué hay hoy](#-qué-hay-hoy)
- [🗺️ Estrategia: global primero, después por país](#️-estrategia-global-primero-después-por-país)
- [🏗️ Arquitectura](#️-arquitectura)
- [🚀 Quick Start](#-quick-start)
- [📄 Estructura de contenido](#-estructura-de-contenido)
- [🩺 Estado del pivote (qué falta)](#-estado-del-pivote-qué-falta)
- [🤝 Contribuir](#-contribuir)
- [📚 Documentación](#-documentación)
- [❓ FAQ](#-faq)
- [📜 Licencia](#-licencia)

---

## 🎯 Visión

**AutoFicha** es un catálogo de vehículos (autos y motos) con fichas técnicas
verificables: cada dato relevante (potencia, precio, consumo, dimensiones,
etc.) cita su fuente y un nivel de confianza explícito, en vez de presentarse
como verdad absoluta sin origen. La idea no es competir con un foro o una
wiki genérica, sino ser la referencia rápida y comparable: "quiero saber los
datos reales de este auto, y de dónde salen".

Pensado para dos públicos:
- **Compradores y curiosos** que buscan una ficha confiable y comparable
  antes de decidir.
- **Colaboradores** que quieran sumar o corregir fichas siguiendo un
  esquema de datos consistente.

## ✨ Qué hay hoy

| Categoría | Cantidad | Detalle |
|-----------|----------|---------|
| 🚗 **Vehículos** | **250** fichas activas | Autos, SUVs, pickups y motos de **75 fabricantes** distintos |
| 🌍 **Cobertura** | Global | Marcas europeas, americanas, japonesas, coreanas, chinas (BYD, Chery, BAIC, Changan, GWM...) e indias (Bajaj, Mahindra) conviven en el mismo catálogo |
| 🔎 **Evidencia** | 196/250 con fuente citada sólida (78%) | Todo dato declara un nivel de confianza — ver [niveles de evidencia](#niveles-de-evidencia) |
| 📰 **Noticias / Guías** | Tipos habilitados, sin contenido aún | Sección lista en el código, pendiente de primer contenido real |

## 🗺️ Estrategia: global primero, después por país

El criterio de expansión de contenido, de cara a quien sume fichas, es:

1. **Fase actual — catálogo global:** ampliar la cobertura de modelos y
   fabricantes a nivel mundial, con specs y precios de referencia
   internacional (o del mercado más relevante de cada modelo cuando el
   precio varía fuerte por región — ya pasa hoy, ver ejemplo del Audi A4
   más abajo).
2. **Fase siguiente — profundización por país:** una vez que la cobertura
   global sea sólida, sumar capas específicas por mercado: precio local,
   variantes/versiones que solo se venden en ese país, red de
   concesionarios (el mapa interactivo con Leaflet ya está listo en el
   código, solo falta la geografía real — ver `src/app/mapa/page.tsx`),
   e impuestos/patentamiento cuando aplique.

Esto ya se refleja en el modelo de datos: el campo `mercados` de cada
vehículo es un array (`["Europa", "India", "Latinoamérica", ...]`) pensado
para ese quiebre futuro entre "cobertura global" y "detalle por país".

## 🏗️ Arquitectura

### Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 + React 19 + TypeScript 5 |
| Estilos | Tailwind CSS 3 + plugin Typography |
| Fondo 3D del hero | Three.js (r185) |
| Validación de datos | Zod 4 |
| Búsqueda | Fuse.js 7 (fuzzy search) |
| Mapa (pausado, listo para reactivar) | Leaflet + clustering |
| Tests | Vitest |
| Deploy | Vercel |

### Estructura de directorios

```
AutoFicha/
├── 📁 public/
│   └── images/entities/vehiculos/   # Imágenes de vehículos (WebP)
│
├── 📁 src/
│   ├── app/                         # Next.js app router
│   │   ├── [entityType]/            # Rutas dinámicas: /vehiculos, /noticias, /guias
│   │   ├── vehiculos/fabricante/    # Listado por fabricante
│   │   ├── comparar/                # Comparador lado a lado
│   │   ├── galeria/                 # Galería de imágenes
│   │   └── mapa/                    # Mapa (pausado — ver docs/)
│   ├── components/                  # Componentes React
│   ├── content/                     # Base de datos de contenido (JSON)
│   │   └── vehiculos/               # 250 fichas de vehículos
│   ├── lib/                         # Utilidades (entities, search, relations, seo)
│   └── types/                       # Contratos TS + schemas Zod
│
├── scripts/
│   ├── verify-content-integrity.mjs # Validación de datos
│   ├── verify-relations-integrity.mjs
│   ├── verify-seo-routes.mjs
│   ├── audit-evidence-coverage.mjs  # Cobertura de fuentes citadas
│   └── process-images.mjs           # Pipeline de imágenes
│
└── README.md
```

## 🚀 Quick Start

### Requisitos
- Node.js 18+ (LTS recomendado)
- npm 9+
- Git 2.30+

### Instalación

```bash
# 1. Cloná el repositorio
git clone https://github.com/hnk375561-lab/GTA6-CODEX.git
cd GTA6-CODEX/GTA6-CODEX

# 2. Instalá dependencias
npm install

# 3. Verificá tipos (importante ahora mismo: el pivote de tipos no se
#    corrió todavía contra un build real, ver "Estado del pivote" abajo)
npm run type-check

# 4. Levantá el servidor de desarrollo
npm run dev

# 5. Abrí http://localhost:3000
```

### Comandos útiles

```bash
npm run verify:content    # Valida integridad del contenido
npm run verify:relations  # Valida relaciones entre entidades
npm run verify:seo        # Verifica metadata SEO
npm run audit:evidence    # Audita cobertura de fuentes citadas
npm run test               # Corre tests (Vitest)
npm run check:unused       # Detecta código/exports sin usar (knip)
```

## 📄 Estructura de contenido

Cada vehículo es un archivo JSON en `src/content/vehiculos/{slug}.json`.
Campos reales usados hoy (tomado de una ficha existente, `audi-a4.json`):

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

El `Vehicle` de TypeScript (`src/types/entity.ts`) define un set mínimo de
campos con forma fija (`manufacturer`, `class`, `performance`, etc.); el
resto de las claves que ves en los JSON reales (`transmision`, `potenciaKW`,
`equipamiento`, `colores`, etc.) son adicionales y se validan de forma
abierta, no contra un schema estricto — así una ficha puede tener más o
menos detalle sin romper el build.

### Niveles de evidencia

Cada ficha declara qué tan sólida es la fuente de sus datos:

| Nivel | Significado | Uso actual |
|-------|-------------|------------|
| `oficial-nombrado` | Confirmado por ficha técnica oficial del fabricante | 126 fichas |
| `oficial-visual` | Visible en material oficial, sin confirmación textual | — |
| `oficial-visual-multifuente` | Igual al anterior, con más de una fuente oficial | — |
| `respaldado` | Sin confirmación oficial directa, pero con fuentes secundarias solventes | 124 fichas |
| `especulativo` | Rumor o estimación razonable, marcado como tal | — |

## 🩺 Estado del pivote (qué falta)

Este repo viene de reconvertir un proyecto sobre GTA VI. Ya se hizo el
pivote de más impacto (tipos de entidad, contenido real de vehículos,
navegación, home), pero quedan cabos sueltos conocidos — se listan acá para
que no haya sorpresas:

- [ ] **Nombre del repositorio en GitHub** sigue siendo `GTA6-CODEX`.
- [ ] **Cero fotos reales de vehículos** — `public/images/entities/vehiculos/`
  está vacío. Hay un pipeline para poblarlo sin infringir copyright:
  `npm run generate:manifest-commons:write` busca en Wikimedia Commons una
  foto con licencia libre (CC0/CC-BY/CC-BY-SA) por vehículo y genera
  `real-images-manifest.json`; el workflow manual **"Generar manifest de
  imágenes desde Wikimedia Commons"** (en Actions) corre esto y abre un PR
  para revisión humana antes de mergear (la búsqueda es por texto y puede
  traer el modelo/año equivocado, hay que confirmar cada foto a mano). La
  cobertura no llega al 100% — autos muy nuevos o de nicho suelen no tener
  foto libre en Commons todavía; esos quedan pendientes de resolver por
  otra vía (kit de prensa oficial con permiso, banco de fotos con licencia
  comercial, o ilustración). Una vez el manifest está aprobado y mergeado,
  `npm run process-images:apply` baja y procesa las imágenes reales a
  `public/images/entities/vehiculos/`.

<details>
<summary>Resuelto (verificado, ya no aplica)</summary>

Esta lista tenía 8 ítems y se auditó el repo real contra cada uno
(no solo lo que decía este archivo). Los siguientes 6 ya no existen y
se sacaron de la lista de arriba para no hacerle perder tiempo a la
próxima persona buscando algo que no está:

- `npm run type-check` corre limpio contra el código actual.
- `src/app/[entityType]/page.tsx` y `[slug]/page.tsx` no tienen labels
  ni condicionales de tipos de entidad viejos (`Personajes`, `Trailers`).
- No quedan componentes huérfanos de tráilers ni del mapa ficticio
  (`TrailerScenes.tsx`, `TrailerStats.tsx`, `TrailerPlayer.tsx`,
  `LeonidaMapCanvas.tsx`, `LeonidaMapExplorer.tsx`) en el repo.
- `tailwind.config.js` no tiene tokens `gta-*` — usa la paleta
  `auto-*` ("Leonida Nights"). El script `verify:tailwind`, que
  todavía comparaba contra los tokens viejos y por eso fallaba
  siempre, se actualizó para chequear los tokens reales.
- No quedan archivos `.json.rej` en `src/content/vehiculos/`.
- `vercel.json` ya apunta a `https://autoficha.vercel.app`, no al
  dominio viejo.

Además, un bug real que **no** estaba en esta lista se encontró y
corrigió en la auditoría: los 250 JSON de `src/content/vehiculos/`
tenían BOM UTF-8, lo que hacía fallar `JSON.parse` en silencio y
dejaba el catálogo con 0 vehículos en producción pese a que todos los
checks de CI pasaban en verde. Ver el historial de commits para el
detalle; ahora hay un check (`npm run verify:min-count`) que falla si
esto vuelve a pasar.

</details>

## 🤝 Contribuir

Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md) para la guía completa. En
resumen:

1. Forkeá el repositorio
2. Creá una rama (`git checkout -b feature/mi-aporte`)
3. Para contenido nuevo, seguí la estructura de [`src/content/README.md`](./src/content/README.md)
4. Corré `npm run verify:content` antes de abrir el PR
5. Abrí el Pull Request describiendo el cambio

## 📚 Documentación

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — cómo agregar o editar contenido
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — problemas comunes y cómo resolverlos
- [`src/content/README.md`](./src/content/README.md) — esquema completo de datos

## ❓ FAQ

**P: ¿Por qué el repo se sigue llamando GTA6-CODEX?**
R: Es un resabio del pivote — está en la lista de pendientes de arriba.
El contenido y el código ya no tienen relación con GTA VI.

**P: ¿Puedo usar este contenido en mi proyecto?**
R: Ver [`LICENSE`](./LICENSE) — el repositorio no tiene licencia abierta
por defecto.

**P: ¿Cómo agrego un vehículo nuevo?**
R: Ver [`src/content/README.md`](./src/content/README.md) para el formato
exacto y [`CONTRIBUTING.md`](./CONTRIBUTING.md) para el flujo de PR.

**P: ¿De dónde salen los datos?**
R: De fuentes públicas por vehículo (fabricante, prensa especializada) —
cada ficha cita su fuente primaria en el campo `evidence.primarySource`.

## 📜 Licencia

Ver [`LICENSE`](./LICENSE).
