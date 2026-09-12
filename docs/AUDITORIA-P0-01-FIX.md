# Auditoría UX Red Team — P0-01 FIX

## El Problema: HTTP 402 Payment Required en Producción

**Severidad:** P0 — UX Catastrófica  
**Problema:** El sitio en vivo (`https://gta-6-codex.vercel.app`) devuelve HTTP 402 "Payment Required"  
**Impacto:** 100% de abandono de usuarios. El producto no existe para nadie que lo visite ahora mismo.

```
HTTP 402 Payment Required
```

### Por Qué Pasó

El servidor Vercel devuelve este error cuando:

1. **Plan agotado:** El proyecto excedió los límites del plan actual (invocaciones, bandwidth, etc.)
2. **Problema de facturación:** Tarjeta rechazada, pago pendiente, o acción manual requerida
3. **Límite de Cloudflare Workers:** Si está usando Vercel con Cloudflare, el plan de Workers puede estar limitado

### Pasos para Resolver (Orden de Prioridad)

#### Paso 1: Verificar el Dashboard de Vercel

1. Accedé a https://vercel.com/dashboard
2. Seleccioná el proyecto `gta-6-codex` (o `sin-frenos`)
3. Buscá en:
   - **Settings > Billing & Usage:** ¿Hay alertas de límite alcanzado?
   - **Settings > Usage:** ¿Qué se está usando? (Invocations, Bandwidth, Serverless Functions)
   - **Deployments:** ¿Está la última compilación en rojo?

#### Paso 2: Revisar el Plan Actual

En **Settings > Billing**:

```
Plan Actual: [Free | Pro | Enterprise]
```

**Si es Free:**
- Límite de invocations: 120 por hora
- Límite de bandwidth: Bajo
- **Solución:** Upgradar a Pro ($20/mes) o buscar optimizar el código

**Si es Pro:**
- Límite de invocations: Mayor, pero no ilimitado
- **Solución:** Revisar los logs para ver qué consume

**Si está limitado:**
- **Opción A:** Upgradar el plan
- **Opción B:** Contactar support@vercel.com para una excepción temporal mientras se optimiza

#### Paso 3: Revisar los Logs de Vercel

En el dashboard:

```
Analytics → Functions
```

¿Hay un spike anormal de invocations? Comparar con días anteriores.

**Causes típicas de overuse:**
- Next.js Image Optimization sin límites
- Prefetch de links sin `prefetch={false}` (ver TROUBLESHOOTING.md, error 1027 Cloudflare)
- API routes sin cache
- Middleware corriendo en cada request

#### Paso 4: Revisar Cloudflare (si está activo)

Si el dominio está en Cloudflare:

1. Accedé a https://dash.cloudflare.com
2. Seleccioná el domain `gta-6-codex.vercel.app`
3. **Workers & Pages** → Analizar plan y uso

**Error 1027** = "This website has been temporarily rate limited"  
→ Ver TROUBLESHOOTING.md para la historia completa de cómo pasó (09/09/2026)

#### Paso 5: Método Temporal (Emergency)

Si necesitás que el sitio vuelva UP ahora mismo:

1. **Deployer manualmente a otra plataforma** (Netlify, Railway, etc.) desde el repo de GitHub
   ```bash
   npm run build
   npm run start
   ```

2. **O crear un subdomain temporal** en otro hosting mientras se resuelve Vercel

3. **Actualizar DNS** para apuntar a donde esté funcionando

### Solución Permanente Recomendada

El verdadero problema es que el sitio tiene **costos crecientes** en Vercel por:

1. **Prefetch de links:** Cada card de vehículo (`EntityCard`) genera requests fantasma (ya arreglado en commit d03717eb, pero se perdió en refactor posterior)
2. **Image Optimization:** Las 250 fotos se optimizan on-demand  
3. **Build time:** 250 vehículos + búsqueda fuzzy = compilación pesada

**Acciones de largo plazo:**

```
1. Activar Static Generation (SSG) completo para /vehiculos, /fabricantes, /guias
   → Todas las páginas generadas en build time, no en request time
   
2. Cache Headers agresivos en Vercel
   → s-maxage=86400 (24h) para listados estáticos
   → s-maxage=3600 (1h) para búsqueda
   
3. Image Optimization a través de Cloudinary o similar
   → Offload de Vercel
   
4. Considerar un plan anual de Vercel
   → Más cost-effective que pagar por overages month-to-month
   
5. Monitorear invocations en real time
   → Alertas en Slack/email si se acerca al límite
```

### Checklist de Resolución

- [ ] Verificar Vercel dashboard: plan, usage, alertas
- [ ] Verificar Cloudflare Workers: plan, invocations
- [ ] Revisar últimos deployments: ¿hay cambios de código que causaron el spike?
- [ ] Revisar GitHub Actions: ¿hubo rebuild automático?
- [ ] Si todo OK: Upgradar plan o reducir invocations
- [ ] Deployer manualmente para confirmar que funciona en dev
- [ ] Test en production con el dominio nuevo
- [ ] Actualizar DNS si es necesario
- [ ] Comunicar a usuarios que el sitio está de vuelta (si fue downtime visible)

### Documentación Relacionada

- **TROUBLESHOOTING.md** — Historial de Error 1027 (Cloudflare), junio-septiembre 2026
- **docs/plan-escalado-1000-vehiculos.md** — Plan de optimización para Fase 1 (menos invocations)
- **Commit d03717eb** — Fix original del bug de prefetch (08/09/2026)
- **Commit f18d4ae8** — Rediseño showroom (donde se perdió el fix)

### Contacto de Soporte

**Vercel Support:** support@vercel.com  
**Cloudflare Support:** https://support.cloudflare.com  
**GitHub Actions:** https://github.com/hnk375561-lab/Sin-Frenos/actions

---

**Nota Final:** Este problema es **crítico** y debe resolverse **ANTES** que cualquier otro cambio en el repo. Toda la auditoría UX es irrelevante si el sitio no carga.
