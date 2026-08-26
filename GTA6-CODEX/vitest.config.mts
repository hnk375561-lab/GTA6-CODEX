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
    // `pool: 'forks'` en vez del default `'threads'`: en Windows, el pool de
    // threads deja un handle abierto del servicio interno de esbuild/Vite
    // que a veces no se libera al terminar los tests ("close timed out
    // after 10000ms ... something prevents Vite server from exiting"),
    // aunque todos los tests hayan pasado. Es un problema conocido de
    // Vitest con ese pool en Windows (no de este proyecto ni de estos
    // tests) — correr cada archivo de test en un proceso hijo real
    // (`fork`) en vez de un worker thread evita que ese handle sobreviva
    // al cierre y el comando `vitest run` termina limpio.
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})

