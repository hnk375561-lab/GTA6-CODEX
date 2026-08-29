# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto no usa versionado semántico formal todavía (sitio de
contenido en evolución continua, no una librería con API pública) — las
entradas se agrupan por fecha en vez de por número de versión.

## [Sin publicar]

### Agregado
- Wishlist / favoritos: botón de corazón en cada ficha (listados y
  catálogo) para guardar vehículos y otras entidades, persistido en
  `localStorage` del navegador (sin cuenta de usuario). Nueva página
  `/favoritos` para ver y gestionar lo guardado, con acceso desde el
  header y el footer.
- Calculadora de cuota/financiamiento (`/financiamiento`, link en el
  footer): simulación de cuota mensual (sistema francés) según precio,
  entrega, tasa anual y plazo. El precio se ingresa a mano — no se
  auto-completa desde la ficha del vehículo porque ese campo hoy es
  texto libre sin formato consistente (ver comentario en
  `src/lib/financing.ts`); auto-parsearlo arriesgaba mostrar una cuota
  calculada sobre una cifra incorrecta.
- Tests unitarios: `useWishlist` (persistencia, sincronización entre
  instancias, manejo de storage corrupto) y `calculateFinancing`
  (matemática de amortización, casos límite).
- Este CHANGELOG.

### No incluido en este batch
- Notificaciones de cambio de precio: no es un quick win real. Requiere
  (a) un precio numérico estructurado por vehículo — hoy `price` es
  texto libre inconsistente entre las 250 fichas, (b) un proceso
  programado que vuelva a scrapear/actualizar precios (el propio
  TODO.md lo lista aparte, en "Data Maintenance" > "Scraper de precios
  actualizados", como Major Task, no Quick Win), y (c) un canal de
  envío real (email o push), que implica un servicio de backend nuevo.
  Construir esto "rápido" habría significado simular alguna de esas
  partes — se prefirió no entregarlo antes que entregarlo a medias.

### Pendiente (ver TODO.md para el detalle completo)
- Tests unitarios de la wishlist y del resto de features sin cobertura.
- Notificaciones de cambio de precio, calculadora de financiamiento,
  reserva de test drive.
- Documentación de API (OpenAPI) y de arquitectura.

## Historial previo

El proyecto no tenía CHANGELOG hasta esta entrada. En base a `TODO.md`,
el trabajo previo ya entregado incluye, sin fechas exactas por entrada:

- Catálogo de 250 fichas de vehículos, categorizadas en 10 tipos.
- Sistema de tags, galería y referencias de media.
- Especificaciones técnicas completas y ratings de seguridad (NCAP).
- Optimización SEO (rutas, metadata, sitemap).
- Registro de auditoría (audit trail) y auditorías de integridad de datos
  (ver `docs/audit-powertrain-integrity-2026-08.md` y
  `docs/audit-performance-2026-08.md`).
- Precios globales para 9 países.
- Sistema de ratings de usuarios.
- Datos de rendimiento (performance) por vehículo.
- Modelos relacionados (relations) entre entidades.
- Comparador de hasta 3 vehículos lado a lado (`/comparar`), embebido
  también en el listado de vehículos.

De acá en adelante, cada cambio notable se agrega arriba, en
"Sin publicar", y se cierra bajo una fecha (`## [YYYY-MM-DD]`) al
publicarse.
