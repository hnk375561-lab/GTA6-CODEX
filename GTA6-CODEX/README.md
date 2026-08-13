# GTA6 Codex

Un wiki editorial de primer nivel sobre Grand Theft Auto 6, construido con arquitectura profesional desde el inicio.

## 🎯 Visión

GTA6 Codex no es un MVP descartable. Es la base definitiva de un proyecto que puede crecer hacia cientos o miles de entidades sin necesidad de rediseño.

- **Información verificada**: Distinción clara entre confirmado, rumor y análisis propio
- **Arquitectura extensible**: Nuevo contenido → nueva página automáticamente
- **Diseño premium**: Sistema visual cohesivo y profesional, no un template genérico
- **Rendimiento**: Server Components, SSG, optimización desde el día 1
- **SEO completo**: URLs limpias, metadata dinámica, Schema.org, sitemap

## 🏗️ Stack Tecnológico

- **Framework**: Next.js 15 con App Router
- **Lenguaje**: TypeScript (tipado strict)
- **Estilos**: Tailwind CSS + sistema de diseño personalizado
- **Contenido**: JSON + MDX versionados
- **Búsqueda**: Fuse.js (local, sin dependencias externas)
- **Analytics**: GA4 + Vercel Analytics
- **Deploy**: Vercel (auto build/deploy desde GitHub)
- **SEO**: Sitemap dinámico, robots.txt, Schema.org/JSON-LD

## 🚫 Sin

- PostgreSQL
- CMS propio
- Backend innecesario
- Autenticación
- Comentarios
- Sistema de usuarios
- Elasticsearch o motor de búsqueda externo

La infraestructura es deliberadamente simple. La calidad está en la presentación y contenido.

## 📁 Estructura de Proyecto

```
GTA6-CODEX/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Layout raíz
│   │   ├── page.tsx            # Homepage
│   │   ├── globals.css         # Estilos globales
│   │   ├── not-found.tsx       # 404
│   │   └── [entityType]/
│   │       └── [slug]/
│   │           └── page.tsx    # Páginas de entidades (dinámicas)
│   ├── components/             # Componentes React
│   │   ├── layout/             # Layout components
│   │   ├── entities/           # Entity-specific components
│   │   └── ui/                 # Componentes UI reutilizables
│   ├── types/                  # Definiciones TypeScript
│   ├── lib/                    # Funciones utilitarias
│   ├── content/                # Contenido versionado (JSON/MDX)
│   │   ├── personajes/
│   │   ├── vehiculos/
│   │   ├── ubicaciones/
│   │   └── ...
│   └── styles/                 # Sistema de diseño
├── public/                     # Assets estáticos
├── vercel.json                 # Config Vercel
├── next.config.js              # Config Next.js
├── tailwind.config.js          # Config Tailwind
├── tsconfig.json               # Config TypeScript
└── package.json                # Dependencias
```

## 🚀 Inicio Rápido

### Desarrollo local (si aplica)

```bash
npm install
npm run dev
```

Abre http://localhost:3000

### Deploy a Vercel

1. Conecta el repo a Vercel
2. Vercel detecta Next.js automáticamente
3. Build y deploy automático en cada push

## 📝 Añadir Contenido

### 1. Crear archivo JSON

```
src/content/personajes/jason.json
```

### 2. Estructura básica

```json
{
  "slug": "jason",
  "type": "personajes",
  "title": "Jason",
  "description": "Protagonista de GTA 6",
  "status": "confirmado",
  "tags": ["protagonista"],
  "createdAt": "2024-08-13T00:00:00Z",
  "updatedAt": "2024-08-13T00:00:00Z",
  "relations": []
}
```

### 3. Commits y Push

```bash
git add src/content/personajes/jason.json
git commit -m "feat: add Jason character entity"
git push
```

Vercel buildea automáticamente. La página `/personajes/jason` está lista.

## 🔍 Sistema de Información

### Confirmado ✓

Información oficial de Rockstar Games o ampliamente verificada.

```json
"status": "confirmado"
```

### Rumor ⚠️

Especulación, leaks no confirmados, teorías comunitarias.

```json
"status": "rumor"
```

### Nuestro 📊

Análisis, conclusiones y teorías propias del sitio.

```json
"status": "nuestro"
```

## 🔗 Relaciones

Las relaciones conectan entidades de forma consistente:

```json
"relations": [
  {
    "targetType": "personajes",
    "targetSlug": "lucia",
    "relation": "companion"
  },
  {
    "targetType": "ubicaciones",
    "targetSlug": "liberty-city",
    "relation": "appears_in"
  }
]
```

Las relaciones se usan automáticamente para generar:
- Contenido relacionado
- Navegación contextual
- Breadcrumbs
- Módulos "también relacionado"

## 🎨 Sistema de Diseño

Tailwind + variables CSS personalizadas. Todos los colores, tipografía y spacing están centralizados:

```css
--gta-dark, --gta-accent, --gta-accent-orange
--gutter-width, --transition-base
```

Componentes reutilizables:
- `<Card />`, `<Badge />`, `<Button />` (aún por crear)
- `<EntityPage />`, `<EntityRelations />` (aún por crear)
- `<Header />`, `<Footer />` (listos)

## 📊 Analytics

GA4 + Vercel Analytics integrados. Placeholder en `layout.tsx`, reemplazar con tu ID de GA4.

```tsx
{/* GA4 */}
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" />
```

## 🔐 SEO

- Metadata dinámica por entidad
- Open Graph + Twitter Cards
- JSON-LD structured data
- Sitemap dinámico
- robots.txt
- Canonical URLs
- Breadcrumbs estructurados

Todo automático. Solo crear contenido.

## 🐛 Validaciones

El build valida automáticamente:

✓ JSON válido  
✓ Slug único  
✓ Tipo válido  
✓ Status válido  
✓ Relaciones apuntan a entidades existentes  
✓ Campos obligatorios  

Si falla, el build se detiene con error claro.

## 📱 Responsive

Diseño pensado desde el inicio para:
- Desktop
- Tablet
- Móvil

Mobile-first principles aplicados en todo el CSS.

## ⚡ Rendimiento

- Server Components (máximo rendimiento)
- SSG donde aplicable
- ISR para contenido dinámico
- Imágenes optimizadas (`next/image`)
- Cero JavaScript innecesario

## 📋 Fases Siguientes

### Fase 2: Contenido Base
- Personajes principales
- Ubicaciones clave
- Vehículos destacados
- Primeras misiones

### Fase 3: Relaciones y Navegación
- Sistema de búsqueda con Fuse.js
- Navegación contextual
- Breadcrumbs inteligentes
- Módulos de contenido relacionado

### Fase 4: Expansión Editorial
- Noticias
- Guías
- Análisis profundo
- Comparativas

## 🤝 Contribuir

El contenido es la fuente de verdad. Crear contenido es crear commits:

```bash
git add src/content/...
git commit -m "feat: add [description]"
git push
```

Sin work-arounds, sin trabajo ficticio.

## 📄 License

Proyecto personal. GTA es marca registrada de Rockstar Games / Take-Two Interactive.

---

**Construido con estándares profesionales. Sin MVPs descartables.**
