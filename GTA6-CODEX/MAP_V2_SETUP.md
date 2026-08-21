# 🗺️ Mapa Mejorado V2 - Setup Guide

## ✅ Qué cambió

Se agregó **LeonidaMapCanvasV2.tsx** con:
- ✨ Clustering inteligente de marcadores
- 🎯 Filtros avanzados (categorías, zonas, estado)
- 📍 Zoom automático cuando filtras
- 🎨 Estilos mejorados con CSS moderno
- 📊 Estadísticas en tiempo real
- 🔍 Búsqueda con mejor UX

## ⚡ Setup - 3 Pasos

### 1. Instalar dependencias
```bash
npm install
# O si tienes issues:
npm install --legacy-peer-deps
```

### 2. Activar V2 (Opcional - por defecto está en V1)
Si quieres probar V2 sin cambiar produción, crea `.env.local`:

```bash
echo 'NEXT_PUBLIC_MAP_V2=true' >> .env.local
```

### 3. Testear
```bash
npm run dev
# Abre http://localhost:3000/map
```

---

## 🔄 Cambiar entre V1 y V2

**Archivo:** `src/components/map/LeonidaMapExplorer.tsx`

Está configurado para usar V2 si existe, sino cae a V1 automáticamente.

Para forzar una versión:

```typescript
// Opción A: Flag de env (recomendado)
const useMapV2 = process.env.NEXT_PUBLIC_MAP_V2 === 'true'

// Opción B: Cambiar manualmente
// const useMapV2 = true  // ← Cambiar esto
```

---

## 📋 Archivos Nuevos/Modificados

```
✅ CREADOS:
  src/components/map/LeonidaMapCanvasV2.tsx      (componente mejorado)
  src/styles/leaflet-cluster.css                 (estilos)

📝 MODIFICADOS:
  package.json                                    (+ leaflet-markercluster)

📚 REFERENCIA (no tocar):
  docs/ANALISIS_MAPA_GTA6.md                     (análisis completo)
  docs/CHEAT_SHEET.md                            (snippets rápidos)
```

---

## 🎯 Próximos Pasos (Opcional)

Si todo funciona bien y querés más features:

1. **Filtros de URL persistentes**
   - Guarda filtros en URL para compartir mapas
   - Archivo: `src/lib/map-filters-url.ts`

2. **Historial de búsqueda**
   - Guarda búsquedas recientes en localStorage
   - Ya implementado en V2

3. **Atajos de teclado**
   - Ctrl+F = abrir búsqueda
   - Ctrl+0 = zoom normal
   - Implementar en componente

4. **Minimap**
   - `npm install leaflet-minimap`

---

## 🧪 Testing Checklist

- [ ] Mapa carga sin errores
- [ ] Clustering agrupa marcadores
- [ ] Filtros por categoría funcionan
- [ ] Filtros por zona funcionan
- [ ] Búsqueda filtra ubicaciones
- [ ] Stats muestran números correctos
- [ ] Zoom automático después de filtrar
- [ ] Panel derecho actualiza
- [ ] Pantalla completa funciona
- [ ] Mobile responsive

---

## 🐛 Si algo falla

### Error: "Cannot find module 'leaflet-markercluster'"
```bash
npm install
npm ci
npm run dev
```

### Error: "SSR hydration mismatch"
Verifica que `LeonidaMapCanvasV2.tsx` tiene:
```typescript
'use client'  // ← Debe estar al inicio
```

Y que `LeonidaMapExplorer.tsx` tiene:
```typescript
ssr: false  // ← En dynamic import
```

### Markers no aparecen
- Verifica coordenadas en `leonida-map-coordinates.ts`
- Revisa console (F12) para errores

### Performance lenta
- Si hay +500 marcadores, aumento `maxClusterRadius`
- O implementa virtualización

---

## 📞 Preguntas

Revisa:
1. **ANALISIS_MAPA_GTA6.md** → explicación detallada
2. **CHEAT_SHEET.md** → snippets y debugging
3. Consola del navegador (F12) → errores específicos

---

**Versión:** 1.0
**Última actualización:** Agosto 21, 2026
**Autor:** Claude AI + GTA6 Codex Team
