# ✅ TAREA 1.1 COMPLETADA - Monetización Base (Semana 1)

**Fecha**: 1 Septiembre 2026  
**Status**: ✅ LISTO PARA DEPLOY  
**Rama**: `main`

---

## 📋 Qué se Hizo

### 1. Componentes Monetización ✅
- **`AdUnit.tsx`** — Google AdSense responsive, 4 formatos (responsive, square, horizontal, vertical)
- **`OlxAffiliateButton.tsx`** — Botón affiliate OLX con A/B testing de copy + tracking Analytics
- **`MercadoLibreAffiliateButton.tsx`** — Botón affiliate ML (backup)

### 2. Inserción en Rutas (3 ubicaciones) ✅

| Ruta | Slot ID | Format | Label |
|------|---------|--------|-------|
| `/src/app/page.tsx` (hero) | `4725819384` | responsive | `ad-hero` |
| `/src/app/[entityType]/[slug]/page.tsx` (ficha) | `8314744878` | responsive | `ad-{slug}` |
| `/src/app/comparar/page.tsx` (comparar) | `5425797006` | responsive | `ad-comparar` |

### 3. Analytics Setup ✅
- **`trackAffiliateClick()`** — OLX/ML clicks con plataforma, vehículo, label
- **`trackAbConversion()`** — Conversión de A/B test en copy de botón
- **`trackAdImpression()`** — Impresiones de ads
- Integración con Google Analytics 4 (gtag)

### 4. A/B Testing ✅
**Variantes de copy en OLX button** (Fase 4.2):
- "Ver en OLX" (control)
- "Buscar en OLX" (variante)
- "Ver publicaciones" (variante)

Persistido por visitante, reportado a GA4.

---

## 🔧 Variables de Entorno Necesarias

```bash
# .env.local (desarrollo) o Vercel Settings (producción)
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Dónde obtener:
1. **Google AdSense Client ID**: [google.com/adsense](https://google.com/adsense) → Configuración → ID de editor
2. **Google Analytics ID**: [analytics.google.com](https://analytics.google.com) → Administración → Detalles de propiedad

---

## 🚀 Cómo Deployer

### Opción 1: Git Push (Automático) ⭐ RECOMENDADO
```bash
# Ya en main, automático en Vercel
git push origin main
# Vercel detecta cambios → build → deploy en 2-3 min
```

### Opción 2: Manual Local
```bash
cd GTA6-CODEX
npm install
npm run build
npm run dev  # local en http://localhost:3000
```

---

## ✅ Testing Checklist

### Local (npm run dev)
```bash
# 1. Abrir http://localhost:3000
# 2. Buscar los 3 AdUnits:
#    - Bajo el QuickSearchForm (hero)
#    - Al final de cada ficha de vehículo
#    - Bajo tabla de comparación

# 3. Click en "Ver en OLX" → debe ir a OLX.com.ar/items/q-{vehiculo}
# 4. Abrir DevTools → Console
#    - Sin errores "NEXT_PUBLIC_ADSENSE_CLIENT_ID not configured"
#    - Logs de [AdUnit] y [Analytics]

# 5. Google Analytics Preview:
#    - Network tab → Requests a google-analytics
#    - Events: affiliate_click, ad_impression, ab_conversion
```

### Producción (después de deploy a Vercel)
```bash
# URL: https://gta-6-codex.vercel.app

# 1. Abrirla en navegador
# 2. DevTools → Network → XHR
# 3. Buscar requests a:
#    - pagead2.googlesyndication.com (AdSense)
#    - google-analytics.com (GA4)

# 4. Hacer click en botones
# 5. Revisar Google Analytics Dashboard
#    → Real-time → Eventos → affiliate_click
```

---

## 📊 Métricas Esperadas (Mes 1)

| Métrica | Target | Detalle |
|---------|--------|---------|
| Ad Impressions | 500-1k | AdUnits en 3 ubicaciones × tráfico |
| Affiliate Clicks | 50-150 | CTR 2-5% en fichas y comparar |
| CPM (LatAm) | $0.50-2 | Google AdSense regional |
| Ingresos Ads | $5-20 | Bajo sin tráfico masivo |
| **Objetivo Real** | **$500-1000** | Venta directa a concesionarios (Semana 3) |

---

## 🔗 URLs de Configuración Importantes

- **Google AdSense**: https://www.google.com/adsense/new
- **Google Analytics**: https://analytics.google.com
- **Google Search Console**: https://search.google.com/search-console
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## 📝 Próximos Pasos (Semana 2-3)

1. **Semana 2**: Crear 10 artículos SEO que rankeen
   - "Cómo comprar auto usado en Argentina"
   - "Autos eléctricos disponibles en Concepción del Uruguay"
   - Etc.
   
2. **Semana 3**: Venta directa a concesionarios
   - Media kit PDF (ya generado en `/prospeccion/media-kit-autoficha.pdf`)
   - Script WhatsApp personalizado a 30 locales
   - Target: 3-5 clientes a $500-1500/mes

3. **Semana 4**: Monitoreo y optimización
   - Dashboard de monetización
   - A/B testing en ubicaciones de ads
   - Mejorar CTR de affiliate buttons

---

## 📞 Soporte

**Problema**: AdUnit no aparece  
**Solución**: Verificar `NEXT_PUBLIC_ADSENSE_CLIENT_ID` en .env.local

**Problema**: Affiliate button no trackea  
**Solución**: Revisar GA4 está inicializado (ConsentBanner debe estar activo)

**Problema**: Build falla  
**Solución**:
```bash
npm run verify:all  # Chequea types, lint, tests
npm run type-check # Solo tipos
```

---

## ✨ Status Final

```
✅ Componentes: LISTOS
✅ Rutas: MODIFICADAS
✅ Analytics: INTEGRADO
✅ Git: PUSHEADO a main
✅ Vercel: AUTO-DEPLOY (en curso)
⏳ Google AdSense: REQUIERE CONFIG MANUAL (env var)
```

**Tiempo a dinero**: 1-2 semanas después de aprobar Google AdSense.

---

*Última actualización: Sept 1, 2026 - Claude Automation*
