# Arquitectura de Contenido

Este directorio contiene todo el contenido estructurado de GTA6 Codex. Está organizado por tipo de entidad.

## Estructura

```
content/
├── personajes/       # Personajes del juego
├── vehiculos/        # Vehículos disponibles
├── ubicaciones/      # Ubicaciones y distritos
├── misiones/         # Misiones principales y secundarias
├── armas/            # Armas del juego
├── actividades/      # Actividades y minijuegos
├── organizaciones/   # Facciones y organizaciones
├── negocios/         # Establecimientos y negocios
├── objetos/          # Objetos coleccionables
├── noticias/         # Noticias y actualizaciones
└── guias/            # Guías y tutoriales
```

## Formato de Archivo

Cada archivo de contenido es un JSON con la siguiente estructura:

```json
{
  "slug": "jason-michigander",
  "type": "personajes",
  "title": "Jason Michigander",
  "description": "Protagonista principal de GTA 6",
  "status": "confirmado",
  "content": "Contenido detallado aquí...",
  "tags": ["protagonista", "personaje-principal"],
  "featured": true,
  "createdAt": "2024-08-13T00:00:00Z",
  "updatedAt": "2024-08-13T00:00:00Z",
  "relations": [
    {
      "targetType": "personajes",
      "targetSlug": "lucia-lopez",
      "relation": "companion"
    }
  ]
}
```

## Estados de Información

- **confirmado**: Información oficial de Rockstar Games
- **rumor**: Especulación no confirmada
- **nuestro**: Análisis y teorías propias del sitio

## Slug

El slug debe ser:
- Único dentro del tipo de entidad
- URL-safe (solo caracteres alfanuméricos, guiones, sin espacios)
- Descriptivo y SEO-friendly
- En minúsculas

### Ejemplos válidos:
- `jason-michigander`
- `lucia-lopez`
- `carcer-city`
- `grand-theft-auto-6-main-story`

### Ejemplos inválidos:
- `Jason Michigander` (espacios)
- `jason_michigander` (guiones bajos)
- `JASON` (mayúsculas, aunque se aceptarían)
- `🚗-car` (emojis)

## Relaciones

Las relaciones conectan entidades entre sí de forma consistente.

```json
"relations": [
  {
    "targetType": "personajes",
    "targetSlug": "lucia-lopez",
    "relation": "companion",
    "direction": "bidirectional"
  },
  {
    "targetType": "vehiculos",
    "targetSlug": "dodge-charger",
    "relation": "conducts"
  }
]
```

### Tipos de relación comunes:
- `companion` - Compañero
- `conducts` - Conduce vehículo
- `located_in` - Ubicado en
- `owns` - Posee
- `leads` - Lidera
- `works_for` - Trabaja para
- `appears_in` - Aparece en
- `involves` - Involucra

## Tags

Los tags son palabras clave para clasificación y búsqueda.

```json
"tags": ["protagonista", "personaje-principal", "rival"]
```

## Añadir Nuevo Contenido

### 1. Crear archivo JSON

```bash
content/personajes/nuevo-personaje.json
```

### 2. Llenar con estructura base

```json
{
  "slug": "nuevo-personaje",
  "type": "personajes",
  "title": "Nombre del Personaje",
  "description": "Descripción breve",
  "status": "confirmado",
  "tags": [],
  "createdAt": "2024-08-13T00:00:00Z",
  "updatedAt": "2024-08-13T00:00:00Z",
  "relations": []
}
```

### 3. Completar información

Agregar `content`, propiedades específicas del tipo, relaciones, etc.

### 4. Verificar validación

El sitio automáticamente:
- Valida que el JSON sea válido
- Verifica que el slug sea único
- Detecta relaciones rotas
- Genera la página automáticamente en `/{type}/{slug}`

## Contenido Editorial (MDX)

Para contenido más complejo (guías, noticias), usar MDX:

```bash
content/guias/guia-completa-mision-1.mdx
```

```mdx
---
slug: guia-completa-mision-1
type: guias
title: Guía Completa: Misión 1
status: confirmado
tags: [guia, mision-1, tutorial]
---

# Misión 1: Inicio

Este es el contenido...
```

## Validaciones Automáticas

El build process valida:

✓ JSON válido  
✓ Slug único por tipo  
✓ Tipo de entidad válido  
✓ Status válido  
✓ Campos obligatorios presentes  
✓ Relaciones apuntan a entidades existentes  
✓ Timestamps ISO válidos  

Si alguno falla, el build se detiene y reporta el error.

## Generación Automática de Páginas

Cada archivo en `/content/{type}/{slug}.json` genera automáticamente:

- Página en `/{type}/{slug}`
- Metadata SEO
- Open Graph
- Breadcrumbs
- Enlaces relacionados
- Entrada en sitemap.xml
- Entrada en robots.txt

No se requiere crear archivos de rutas manualmente.
