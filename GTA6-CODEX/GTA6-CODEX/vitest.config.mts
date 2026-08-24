import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Config de Vitest para `src/lib` (lógica pura, sin DOM) y ahora también
 * para componentes React del hero (`src/components/**\/*.test.tsx`).
 *
 * Antes este archivo decía explícitamente "agregar jsdom/testing-library
 * cuando en el futuro se testeen componentes, no antes" — ese momento
 * llegó: los componentes del hero corregidos en esta sesión de auditoría
 * (`CountUp`, `WordRotate`, `HeroNewsFlash`, `HeroCountdownChip`) tenían
 * bugs reales de integridad de contenido/accesibilidad que una suite
 * node-only no puede cubrir (necesitan DOM + eventos de usuario), así
 * que se agregan las deps mínimas: `jsdom` (entorno DOM), `@testing-
 * library/react` (render + queries), `@testing-library/jest-dom`
 * (matchers de aserción sobre el DOM) y `@vitejs/plugin-react` (para que
 * Vite transforme JSX/TSX en los tests, no solo en la app).
 *
 * `environment: 'node'` sigue siendo el default global (los tests de
 * `src/lib/*.test.ts` no necesitan DOM y sería más lento dárselos), y
 * los tests de componentes lo overridean por archivo con el comentario
 * mágico `// @vitest-environment jsdom` en su primera línea — así ningún
 * test existente cambia de entorno ni de velocidad por este cambio.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})

