/**
 * Shim de compatibilidad — FASE 5 renombró este módulo a
 * `vehicle-category.ts` (taxonomía de 2 niveles: `class` + `category`,
 * 12 categorías en vez de las 7 anteriores). Este archivo se mantiene
 * SOLO para no romper imports existentes; toda la lógica vive ahora en
 * `vehicle-category.ts`. Preferí importar directamente desde ahí en
 * código nuevo.
 */
export * from './vehicle-category'
