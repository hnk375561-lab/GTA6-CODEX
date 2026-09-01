# 🚗 AUTOFICHA - ESPECIFICACIÓN MAESTRA DEL PROYECTO

**Fecha de creación**: Agosto 31, 2026  
**Versión del plan**: 1.0 (FINAL - Para todas las sesiones futuras de Claude)  
**Autor del proyecto**: Usuario (hnk375561-lab)  
**Ubicación**: Concepción del Uruguay, Entre Ríos, Argentina  
**Disponibilidad**: Full-time (30+ horas/semana)  
**Metodología**: 99% asistencia de IA (Claude principalmente)

---

## 📋 ÍNDICE COMPLETO

1. [CONTEXTO HISTÓRICO DEL PROYECTO](#contexto-histórico)
2. [QUÉ ES AUTOFICHA HOY](#qué-es-autoficha-hoy)
3. [LA IDEA ORIGINAL VS. LA REALIDAD](#la-idea-original-vs-la-realidad)
4. [QUÉ QUIERE EL USUARIO EXACTAMENTE](#qué-quiere-el-usuario-exactamente)
5. [RESTRICCIONES Y NO-NEGOCIABLES](#restricciones-y-no-negociables)
6. [METODOLOGÍA DE TRABAJO](#metodología-de-trabajo)
7. [PLAN DE ACCIÓN DETALLADO (30 DÍAS)](#plan-de-acción-detallado-30-días)
8. [COMPONENTES A CONSTRUIR](#componentes-a-construir)
9. [ROADMAP DE MONETIZACIÓN](#roadmap-de-monetización)
10. [CRITERIOS DE ÉXITO](#criterios-de-éxito)
11. [HANDOFF PARA PRÓXIMAS SESIONES](#handoff-para-próximas-sesiones)

---

## CONTEXTO HISTÓRICO

### Origen del Proyecto

**Inicialmente**: El usuario tenía un repo llamado `GTA6-CODEX` que era una **enciclopedia de fans sobre Grand Theft Auto VI**. Era un proyecto completo con datos, imágenes, estructura.

**El Pivote (Agosto 2026)**: Decidieron **pivotear completamente** a `AutoFicha` — un **catálogo de fichas técnicas reales de autos y motos** (sin relación con Rockstar Games).

**Por qué pivotar**: 
- GTA VI fanbase tiene riesgo legal (Take-Two)
- Autos es un nicho real con demanda monetizable
- Argentina/LatAm carece de referencia técnica confiable de autos

### Estado del Pivote Actual

**La infraestructura ya existe**:
- Next.js 15 + React 19 + TypeScript (profesional, sin deuda técnica)
- 250 fichas técnicas de autos/motos con datos verificados
- 242 de 250 con fotos reales de Wikimedia Commons
- Búsqueda fuzzy (Fuse.js)
- Comparador lado a lado funcional
- SEO optimizado (JSON-LD, metadata dinámica, sitemap)
- Deploy en Vercel (automagic)
- Analytics integrado (Vercel Analytics + Google Analytics)
- Google AdSense infraestructura lista (consent banner, CSP policy)
- Testing framework (Vitest)

**El proyecto NO es un MVP incompleto.** Es un **producto funcional que falta monetizar**.

---

## QUÉ ES AUTOFICHA HOY

### Propósito

**AutoFicha** es un **catálogo de referencia técnica de vehículos** enfocado en:
- **Usuarios (B2C)**: Personas que buscan comparar fichas técnicas antes de comprar
- **Dato verificable**: Cada dato cita su fuente y nivel de confianza
- **Búsqueda y comparación**: Herramientas para tomar decisiones informadas

### Stack Técnico

| Layer | Tecnología | Estado |
|-------|-----------|--------|
| **Frontend** | Next.js 15, React 19, TypeScript 5 | ✅ Listo |
| **Estilos** | Tailwind CSS 3 + Typography plugin | ✅ Listo |
| **Datos** | JSON estático en `/src/content/vehiculos/` | ✅ 250 fichas |
| **Búsqueda** | Fuse.js 7 (fuzzy, client-side) | ✅ Funcional |
| **Imágenes** | WebP de Wikimedia Commons | ✅ 96.8% cobertura |
| **SEO** | Dynamic metadata, JSON-LD, sitemap | ✅ Completo |
| **Analytics** | Vercel Analytics + Google Analytics (gtag) | ✅ Integrado |
| **Monetización** | Google AdSense (consent banner ready) | 🟡 Infraestructura sí, ads no |
| **Deploy** | Vercel + GitHub Actions CI/CD | ✅ Live |
| **Testing** | Vitest + React Testing Library | ✅ Configurado |

### URLs Importantes

- **Live**: https://autoficha.vercel.app
- **GitHub**: https://github.com/hnk375561-lab/GTA6-CODEX
- **Repo local**: `/home/claude/GTA6-CODEX-main/GTA6-CODEX/`

### Matriz de Completitud

| Componente | Porcentaje | Detalle |
|-----------|-----------|---------|
| **Producto Core** | 95% | Fichas, búsqueda, comparación funcionan |
| **UX/Design** | 90% | Responsive, profesional, sin bugs conocidos |
| **Contenido** | 85% | 250 fichas, 8 fotos pendientes |
| **SEO/Indexación** | 85% | Metadata OK, pero sin tráfico real aún |
| **Monetización** | 5% | Solo infraestructura, ads no activadas |
| **Escalabilidad** | 70% | Optimizado para static generation, no para transacciones |

---

## LA IDEA ORIGINAL VS. LA REALIDAD

### Idea Original del Usuario

**"Quiero convertir mi sitio en algo tipo MercadoLibre, enfocado en compra-venta de autos, ganando comisión por transacción o publicidades."**

### Análisis de Claude (Conversación Inicial)

❌ **Conclusión**: Eso es **inviable** por:
1. Competencia brutal (OLX, Marketplace ya dominan)
2. Complejidad legal (intermediario de transacciones)
3. Fraude en autos es común (requiere verificación)
4. Necesitas escala masiva (100k+ usuarios) para vivir de comisión
5. Tu verdadera fortaleza NO es transacciones, es **datos verificables**

✅ **Lo que SÍ es viable**: Monetizar **fichas técnicas + contenido** mediante:
- Google AdSense (ads contextuales)
- Afiliados a plataformas (OLX, MercadoLibre)
- Publicidades directas de empresas (concesionarios, seguros, talleres)
- Contenido SEO que atrae buscadores

### Conclusión Consensuada

**AutoFicha NO será un marketplace.**  
**AutoFicha será una plataforma de referencia técnica + monetización mediante ads/afiliados.**

La fortaleza es: "Necesito datos reales de este auto antes de comprar/investigar" → Usuario va a AutoFicha → Ve fichas verificadas → Hace click a OLX/concesionario/seguro (dinero para ti)

---

## QUÉ QUIERE EL USUARIO EXACTAMENTE

### Objetivo Primario

**Generar ingresos reales (dinero) en un mes.**

### Especificaciones del Objetivo

1. **Timing**:
   - Idealmente en 30 días
   - Acepta menos si es realista
   - No quiere esperar "6 meses de desarrollo"

2. **Cantidad**:
   - "A toda costa" pero escalable/confiable
   - No es "quick & dirty", es prolijo + ordenado
   - Puede ser chico ($100-500/mes) mientras escale

3. **Metodología**:
   - **100% asistencia de IA** (Claude toma TODAS las decisiones)
   - Usuario: copia/pega, ejecuta, no necesita entender
   - Todo debe ser **code-first, executable**
   - Nada de "planes de 3 meses" — **acciones INMEDIATAS**
   - Claude elige tecnologías, arquitectura, estrategia, timing — usuario NO tiene que decidir nada

4. **Qué NO quiere**:
   - Divisiones de trabajo tipo "haz esto hoy, esto mañana"
   - Documentos largos de análisis (lo ignora, quiere código)
   - Esperar a tener dominio propio (Vercel.app es válido)
   - Marketplace complejo
   - Construcción de usuarios/comunidad (dinero directo es prioridad)

### Estado Actual del Usuario

- **Ubicación**: Concepción del Uruguay, Entre Ríos, Argentina
- **Disponibilidad**: Full-time (30+ horas/semana, realista)
- **Tech Skills**: Intermedio (maneja Next.js, entiende código)
- **Dinero inicial**: ~ARS 500-800 para dominio (opcional, después si genera dinero)
- **Experiencia en ventas**: Ninguna mención, asumir cero
- **Conocimientos locales**: Ninguno en industria auto

---

## RESTRICCIONES Y NO-NEGOCIABLES

### Hard Constraints

1. **No comprar dominio YA**
   - Vercel.app es válido para monetización inicial
   - Si en Mes 1 genera dinero, ENTONCES compra dominio
   - Inversión $0 antes de revenue

2. **Código-first**
   - No análisis infinitos
   - No planes en prosa
   - Ejecutables, deployables, testables

3. **Full-time IA assistance**
   - Usuario NO quiere leer 10k palabras de roadmap
   - Claude hace 99% del trabajo
   - Usuario: copia, ejecuta, itera

4. **Dinero en 30 días o justificar por qué no**
   - Si es posible, hacerlo
   - Si no, Claude es honesto sobre timeline realista
   - Claude toma decisiones ejecutivas basadas en data, sin consultar

5. **100% Claude Decisions**
   - Claude elige todas las tecnologías
   - Claude diseña la arquitectura
   - Claude redacta los emails/artículos
   - Claude decide la estrategia
   - Usuario NUNCA elige nada
   - Usuario NUNCA pregunta "¿cuál hago?"

5. **Sin marketplace**
   - Sin transacciones
   - Sin verificación de usuarios
   - Sin pagos complejos
   - Sin legal/fiscal complicado

### Soft Constraints

1. **Escalable**: Si funciona con 1000 usuarios, debe funcionar con 100k
2. **Confiable**: Revenue stream debe ser predecible (no "suerte")
3. **Prolijo**: Código limpio, no spaghetti
4. **Transparente**: Saber cuánto dinero viene de dónde

---

## METODOLOGÍA DE TRABAJO

### Principios

1. **Atomic tasks**: Una sesión de Claude = 1 deliverable ejecutable
2. **Copy-paste ready**: Usuario copia, pega en su repo, git push, done
3. **No-bullshit**: Nada de "considere esto" — instrucciones claras
4. **Parallelizable**: Mientras usuario ejecuta Tarea A, Claude prepara Tarea B
5. **Metrifiable**: Cada acción tiene métrica (dinero, tráfico, clicks)

### Flujo de Trabajo

```
SESIÓN 1: Claude hace Tarea 1 (código)
         ↓
Usuario ejecuta (copia/pega/deploy) 
         ↓
SESIÓN 2: Claude hace Tarea 2 (contenido/emails)
         ↓
Usuario ejecuta
         ↓
SESIÓN 3: Claude analiza métricas, pivota si necesario
         ↓
Repeat hasta dinero
```

### Qué Claude Entrega en Cada Sesión

- ✅ **Código listo** (copy/paste, 100% funcional)
- ✅ **Decisiones ya tomadas** (tecnologías, arquitectura, estrategia elegidas por Claude)
- ✅ **Instrucciones de 3 minutos** (paso a paso, sin decisiones que tomar)
- ✅ **Testing checklist** (cómo verificar antes de deploy)
- ✅ **Próxima sesión previamente** (Claude decide qué viene después)
- ✅ **Zero ambigüedad** (User nunca dice "¿cuál elijo?", Claude ya eligió)

### Qué Usuario Hace Después de Cada Sesión

1. Copia código en su editor (copy/paste literal)
2. Corre `npm run dev` (verifica que funciona localmente)
3. Haz `git push` (Vercel deploya automático)
4. Reporta: "Funcionó" o screenshot de error
5. Claude ajusta y continúa

**Usuario NO elige nada. Solo ejecuta.**

---

## PLAN DE ACCIÓN DETALLADO (30 DÍAS)

### FASE 1: MONETIZACIÓN TÉCNICA (Semana 1) 
**Objetivo**: Insertar ads y afiliados en el código

#### Tarea 1.1: Google AdSense Integration (2-4 horas)
**Entrega**: Componente React + Modificar 5 páginas

Qué hará Claude:
- Crear `AdUnit.tsx` (componente reutilizable)
- Insertar en: `/vehiculos/[slug]`, `/comparar`, `/fabricantes`, `/page.tsx`
- Testear localmente
- Entregar instrucciones: copy/paste + deploy

Qué debería pasar después:
- Usuario ve ads en páginas (local dev)
- Deploy automático
- Google Analytics rastrealoud ad impressions

Métrica: Las páginas carguen ads sin romper design

---

#### Tarea 1.2: Afiliado OLX + CTA Buttons (2-3 horas)
**Entrega**: Componente de botón + Integración en artículos

Qué hará Claude:
- Crear `OlxAffiliateButton.tsx`
- Crear `FollowUpCTA.tsx` (call to action)
- Agregar en fichas de autos (al final)
- Agregar en artículos (contexto natural)
- Setup UTM params para rastrear clicks en Analytics

Qué debería pasar después:
- Usuario ve botón "Ver en OLX" o similar
- Clicks se rastrean en Google Analytics
- Si alguien compra en OLX vía tu link, obtienes comisión

Métrica: CTR > 2% en fichas populares

---

#### Tarea 1.3: Setup Google Analytics Events (1-2 horas)
**Entrega**: Script de tracking + Dashboard recommendations

Qué hará Claude:
- Agregar eventos personalizados en GA4
  - Ad impressions
  - Ad clicks
  - Affiliate clicks
  - Article views
- Crear dashboard custom en Google Analytics
- Instrucciones: cómo ver datos en real-time

Qué debería pasar después:
- Usuario abre Google Analytics
- Ve qué páginas traen dinero
- Optimiza basado en datos

Métrica: Datos fluyendo a GA4

---

### FASE 2: CONTENIDO MONETIZABLE (Semana 2-3)
**Objetivo**: 10-15 artículos que rankean en Google + atraen clicks

#### Tarea 2.1: Crear 10 Artículos SEO (8-10 horas)
**Entrega**: Artículos listos para publicar

Qué hará Claude:
- Escribir 10 artículos optimizados para SEO local
- Temáticas:
  1. "Mejores autos usados en Concepción del Uruguay 2026"
  2. "Cómo comprar auto usado: guía paso a paso"
  3. "Autos más buscados Argentina 2026"
  4. "Mejores sedanes compactos: comparativa"
  5. "Autos eléctricos en Argentina: dónde comprarlos"
  6. "Autos 0km vs usados: cuál conviene"
  7. "Toyota Concepción del Uruguay: dónde comprar"
  8. "Honda Concepción del Uruguay: dónde comprar"
  9. "Seguros auto Argentina: guía 2026"
  10. "Talleres mecánicos Concepción del Uruguay"

- Cada artículo:
  - 800-1200 palabras
  - Keywords locales/nacionales
  - Incluye CTA natural (OLX, seguros, etc)
  - Formato markdown listo para publicar
  - Slug + metadata

Qué debería pasar después:
- Usuario copia cada artículo a `/src/content/noticias/` o ruta similar
- Verifica localmente (`npm run dev`)
- Deploy
- Google Search Console indexa (1-2 semanas)
- Tráfico empieza a llegar

Métrica: 5+ artículos indexados en Google en 2 semanas

---

#### Tarea 2.2: Crear Template de Artículos (1-2 horas)
**Entrega**: Componente + Estructura de rutas

Qué hará Claude:
- Verificar que `/noticias` o `/articulos` existe como ruta
- Crear componente `ArticlePost.tsx` (si no existe)
- Asegurar que artículos rankean en Google
- Setup JSON-LD para articles (rich snippets)

Qué debería pasar después:
- Usuario puede agregar artículos sin tocar código
- Artículos aparecen en sitio automáticamente
- Google sabe que son artículos (rich snippets)

Métrica: Artículos visibles en autoficha.vercel.app/articulos/

---

### FASE 3: PROSPECCIÓN Y CONTACTO (Semana 3-4)
**Objetivo**: Contactar empresas locales, cerrar 1-2 clientes pagando

#### Tarea 3.1: Mapeo Automatizado de Concesionarios (2-3 horas)
**Entrega**: Script + Lista de contactos

Qué hará Claude:
- Crear script que busca en Google Maps: "concesionarios Concepción del Uruguay"
- Mapear nombres, teléfonos, emails
- Agregar a CSV
- Generar lista de 20-30 contactos

Entrega:
- CSV con: Nombre | Teléfono | Email | Dirección | Marcas
- Script para futuras ciudades (reusable)

Qué debería pasar después:
- Usuario tiene lista de prospección lista
- Puede contactar sin investigar

Métrica: 20+ contactos mapeados

---

#### Tarea 3.2: Email Templates Listos (1-2 horas)
**Entrega**: 5 email templates copy/paste

Qué hará Claude:
- Email 1: "Prospección inicial" (no agresivo)
- Email 2: "Follow-up con tráfico real" (cuando haya datos)
- Email 3: "Propuesta de publicidad" (cierre)
- WhatsApp template (más directo)
- Media kit PDF auto-generado

Cada email:
- Personalizable con 2-3 variables (nombre, marca, zona)
- Profesional pero no robótico
- Incluye call-to-action claro
- Optimizado para LatAm (lenguaje local)

Qué debería pasar después:
- Usuario copia, cambia nombre/empresa, envía
- No debe redactar nada

Métrica: Tasa de respuesta > 10%

---

#### Tarea 3.3: Media Kit PDF Automatizado (2 horas)
**Entrega**: PDF template + Script de generación

Qué hará Claude:
- Crear PDF template profesional:
  - Branding AutoFicha
  - Stats de tráfico (placeholders)
  - Audiencia demográfica
  - Opciones de publicidad (precios)
  - ROI examples
- Script que llena placeholders con datos de Google Analytics

Qué debería pasar después:
- Usuario corre script
- Media kit se genera automático
- PDF listo para enviar a clientes

Métrica: Media kit se ve profesional

---

### FASE 4: OPTIMIZACIÓN Y ESCALA (Semana 4)
**Objetivo**: Monitorear, ajustar, iteración

#### Tarea 4.1: Dashboard de Monetización (3-4 horas)
**Entrega**: Página privada con métricas de dinero

Qué hará Claude:
- Crear `/dashboard` (password protected)
- Mostrar:
  - Dinero de AdSense (API Google)
  - Clicks de afiliados (GA4 events)
  - Tráfico total
  - Tráfico por artículo
  - Proyección de dinero/mes
  - Top keywords que rankean
  
- Refrescar cada 24 horas

Qué debería pasar después:
- Usuario ve dinero en tiempo real
- Sabe qué funciona/qué no
- Optimiza contenido basado en data

Métrica: Dashboard accesible en localhost + Vercel

---

#### Tarea 4.2: A/B Testing Setup (2-3 horas)
**Entrega**: Framework para testear variaciones

Qué hará Claude:
- Setup para probar:
  - Posición de ads (sidebar vs inline vs footer)
  - Texto de botones de afiliados
  - Copywriting en CTAs
  - Orden de artículos en homepage
- Mostrar resultados en dashboard

Qué debería pasar después:
- Usuario puede experimentar sin código
- Optimizar conversión basado en tests

Métrica: Test framework deployado

---

### FASE 5: EXPANSIÓN (Después de Semana 4)
**Objetivo**: Nuevas fuentes de dinero

#### Tarea 5.1: Newsletter Setup (Si Mes 1 tuvo éxito)
**Entrega**: Email list + Automation

Si usuario generó dinero:
- Crear lista de emails (Resend, SendGrid, etc.)
- Newsletter template
- Auto-envío semanal con:
  - Top artículos
  - Nuevas fichas
  - Ofertas de afiliados
  
Métrica: 100+ suscriptores → comisión de seguros/financieras

---

#### Tarea 5.2: Más Afiliados (Si Tráfico > 5k/mes)
**Entrega**: Integración con MercadoLibre, seguros, financieras

Qué hará Claude:
- Mapear afiliados viables:
  - OLX ✅ (ya hecho)
  - MercadoLibre (vehículos)
  - Seguros (Sura, Zurich, La Segunda)
  - Financieras (Santander, ICBC, etc.)
  - Talleres (programmatic, si existe)

- Crear componentes para cada afiliado
- A/B test qué convierte mejor

Métrica: 3+ fuentes de afiliados activas

---

## COMPONENTES A CONSTRUIR

### Lista de Componentes Nuevos (Priority Order)

| # | Componente | Archivo | Tamaño | Prioridad |
|---|-----------|---------|--------|-----------|
| 1 | `AdUnit.tsx` | `/src/components/monetization/AdUnit.tsx` | ~150 lineas | 🔴 CRÍTICO |
| 2 | `OlxAffiliateButton.tsx` | `/src/components/monetization/OlxAffiliateButton.tsx` | ~100 lineas | 🔴 CRÍTICO |
| 3 | `MonetizationDashboard.tsx` | `/src/app/dashboard/page.tsx` | ~400 lineas | 🟡 ALTO |
| 4 | `AnalyticsEvent.ts` | `/src/lib/analytics-events.ts` | ~150 lineas | 🔴 CRÍTICO |
| 5 | `MercadoPagoButton.tsx` | `/src/components/monetization/` | ~100 lineas | 🟡 FUTURO |
| 6 | `ConsentBanner` (MEJORA) | `/src/components/layout/ConsentBanner.tsx` | Modificar | 🟡 ALTO |

### Cambios a Archivos Existentes

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `/src/app/[entityType]/[slug]/page.tsx` | Agregar `<AdUnit />` + `<OlxAffiliateButton />` | Monetizar fichas |
| `/src/app/comparar/page.tsx` | Agregar `<AdUnit />` después de resultado | Monetizar comparaciones |
| `/src/app/page.tsx` | Agregar `<AdUnit />` en hero | Monetizar homepage |
| `/src/components/layout/ConsentBanner.tsx` | Verificar que AdSense funciona | Garantizar compliance |
| `/src/lib/seo.ts` | Agregar tracking events | Medir dinero |

---

## ROADMAP DE MONETIZACIÓN

### Revenue Streams Activados

#### Stream 1: Google AdSense (Semana 1)
- **Mecanismo**: Display ads contextuales
- **Ubicación**: Sidebar + inline en artículos + footer
- **Costo de setup**: 0 (infraestructura existe)
- **Tiempo para dinero**: 1-2 semanas (después de aprobación Google)
- **CPM esperado**: $0.50-2 (LatAm)
- **Ingresos 10k visitas/mes**: $5-20
- **Ingresos 50k visitas/mes**: $25-100

**Realidad**: Lento sin tráfico masivo, pero dinero seguro.

---

#### Stream 2: Afiliados OLX (Semana 2)
- **Mecanismo**: Click → OLX → Comisión si compran
- **Ubicación**: Botón "Ver en OLX" en fichas + artículos
- **Costo de setup**: 0 (solo registro)
- **Tiempo para dinero**: Inmediato (clicks cuantificados en Analytics)
- **CPC esperado**: $0.10-0.50
- **CTR esperado**: 2-5%
- **Ingresos 10k visitas/mes con 3% CTR**: $30-150

**Realidad**: Más dinero que AdSense, pero requiere tráfico calificado.

---

#### Stream 3: Publicidades Directas (Semana 3)
- **Mecanismo**: Concesionarios/Talleres/Seguros pagan por mención
- **Ubicación**: Banner en artículo específico + homepage
- **Costo de setup**: Tiempo de venta (2-3 horas/cliente)
- **Tiempo para dinero**: 1-2 semanas (after first contact closes)
- **Precio/cliente**: ARS 500-1500/mes
- **Objetivo**: 3-5 clientes = ARS 1500-7500/mes

**Realidad**: Dinero REAL, pero requiere venta. Es la clave del mes 1.

---

#### Stream 4: Newsletter + Afiliados (Mes 2+)
- **Mecanismo**: Email list → Ofertas de seguros/financieras
- **Costo**: Setup newsletter (Resend, SendGrid)
- **Tiempo para dinero**: Después de 2k+ suscriptores (~6-8 semanas)
- **CPL esperado**: $2-5 per lead
- **Ingresos 5k suscriptores**: $500-1000/mes

**Realidad**: Lento para empezar, pero más predecible a largo plazo.

---

### Revenue Projection (30 Días)

**Escenario Conservative**:
- Semana 1: AdSense + Afiliados setup (ARS 0)
- Semana 2: Primeros artículos rankean (ARS 100-300)
- Semana 3: Contacto con 2 concesionarios = 1 cliente cierra (ARS 500-1000)
- Semana 4: Dinero fluye, optimización (ARS 800-1200)
- **TOTAL MES 1**: ARS 1,400-2,500

**Escenario Optimista**:
- Si usuario cierra 2-3 clientes en Semana 3
- + Artículos rankean rápido
- **TOTAL MES 1**: ARS 2,500-4,000

**Disclaimer**: Dinero es posible pero no garantizado. Depende de:
- Calidad de artículos (SEO)
- Éxito en venta (closing ability)
- Tráfico inicial (redes, seeding)

---

## CRITERIOS DE ÉXITO

### Métrica 1: Dinero Generado
- **Mes 1 Target**: ARS 1,000+
- **Mes 2 Target**: ARS 2,000+
- **Mes 3 Target**: ARS 5,000+

### Métrica 2: Tráfico
- **Mes 1 Target**: 2k-5k visitas/mes
- **Mes 2 Target**: 10k-20k visitas/mes
- **Mes 3 Target**: 30k+ visitas/mes

### Métrica 3: Conversión
- **Ads CTR**: > 1% (display ads)
- **Affiliate CTR**: > 2% (en fichas)
- **Email Open Rate**: > 20% (cuando exista)

### Métrica 4: Customers Directos
- **Mes 1 Target**: 1-2 concesionarios/locales pagando
- **Mes 2 Target**: 3-5 pagando
- **Mes 3 Target**: 5-10 pagando

### Métrica 5: Technical Success
- **Build time**: < 30 segundos
- **Lighthouse score**: > 80 (performance)
- **Uptime**: > 99.5% (Vercel)
- **Zero errors**: CI/CD verde siempre

---

## HANDOFF PARA PRÓXIMAS SESIONES

### Cómo Claude Debe Leer Este Documento (CRÍTICO)

**SIEMPRE**:
1. Consulta esta especificación antes de responder
2. Si el usuario pregunta algo que está acá, sigue el plan sin desviarse
3. Toma TODAS las decisiones técnicas sin consultar

**Cuando usuario dice "continúa con Tarea X":**
1. Abre esta especificación
2. Ve Tarea X en [PLAN DE ACCIÓN DETALLADO](#plan-de-acción-detallado-30-días)
3. **Ejecuta exactamente lo que dice, sin variaciones**
4. Entrega código + instrucciones (terminal commands)
5. **NUNCA preguntes al usuario "¿quieres X o Y?"**
6. **NUNCA ofrezcas alternativas o opciones**
7. Entrega 1 solución, 100% decidida por Claude

**Formato de respuesta**:
- Código (copy/paste)
- Terminal commands (copy/paste)
- Métricas esperadas
- Punto final.

### Estado Actual del Proyecto

**GitHub Repo**: https://github.com/hnk375561-lab/GTA6-CODEX  
**Live URL**: https://autoficha.vercel.app  
**Deploy**: Vercel + GitHub (automático en `main` push)

### Información de Acceso

- **Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Package manager**: npm
- **Node version**: 18+ (en package.json)
- **Env vars needed**:
  - `NEXT_PUBLIC_GA_ID` (Google Analytics)
  - `NEXT_PUBLIC_ADSENSE_CLIENT_ID` (Google AdSense, cuando esté listo)

### Lo Que YA Existe (No Reinventar)

✅ ConsentBanner.tsx — Google Analytics + AdSense consent  
✅ Analytics setup — Vercel Analytics + gtag  
✅ TypeScript schemas — Zod validation  
✅ Entity system — Vehicle, News, Guide types  
✅ SEO infrastructure — Dynamic metadata, JSON-LD  
✅ Component library — UI components en `/src/components/ui/`

### Lo Que NO Existe (Construir)

❌ Ad unit components  
❌ Affiliate buttons  
❌ Analytics event tracking (personalizado)  
❌ Monetization dashboard  
❌ Article CMS (si lo quiere, sino markdown is fine)

### Próxima Sesión (Sesión 2) - Tarea 1.1

**Qué Claude Entrega (100% decidido, 0% user input)**:

1. ✅ `AdUnit.tsx` — Componente Google AdSense (código completo, copy/paste)
2. ✅ `OlxAffiliateButton.tsx` — Botón affiliate (código completo, copy/paste)
3. ✅ Archivos modificados (3 páginas con ads insertadas)
4. ✅ Instrucciones de 3 minutos (paso exacto)
5. ✅ Testing commands (copy/paste en terminal)
6. ✅ Deploy commands (copy/paste en terminal)
7. ✅ Qué debería ver en Google Analytics (screenshot esperada)

**Qué NO Claude Incluye**:
- Opciones alternativas
- "Considera esto"
- Decisiones pendientes
- Preguntas al usuario
- Documentación larga

**Formato de Entrega**: Código + Terminal commands + Nada más

---

## SUMARIO EJECUTIVO PARA CLAUDE

### En 30 segundos

**AutoFicha es**: Catálogo de fichas técnicas de autos (250 vehículos, live en Vercel)

**Objetivo**: Generar dinero en 30 días

**Metodología**: Insertar ads + afiliados + artículos SEO + contactar empresas locales

**Usuario**: Full-time, **no sabe nada de tech**, **confía 100% en Claude**, solo ejecuta código

**Qué hace Claude**: Toma TODAS las decisiones (tech, arquitectura, estrategia, copywriting)

**Qué hace Usuario**: Copia/pega código, ejecuta comandos, reporta resultados

**Próxima acción INMEDIATA**: Sesión 2 entrega Tarea 1.1 (AdUnit + AffiliateButton + setup Analytics)

---

## CONTROL DE CAMBIOS

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | 2026-08-31 | Documento inicial | Claude + Usuario |
| — | — | — | — |

*Nota: Actualizar este documento si cambian objetivos, restricciones o dirección.*

---

**Este documento es la FUENTE DE VERDAD para todas las futuras sesiones de Claude.**

Si usuario o Claude dudan, volver acá.
