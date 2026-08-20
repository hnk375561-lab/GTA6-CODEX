import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Config mínima de Vitest para testear lógica pura de `src/lib` (sin
 * componentes React ni DOM) — hoy cubre `entity-list-filters.ts`, la
 * pieza de estado más compleja de EntityListExplorer (búsqueda + filtros
 * + orden). Deliberadamente no incluye jsdom/testing-library: si en el
 * futuro se testean componentes, agregar `environment: 'jsdom'` y las
 * deps correspondientes en ese momento, no antes (no instalar peso muerto
 * que hoy nada usa).
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
