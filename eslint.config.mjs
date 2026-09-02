import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

/**
 * Migrado de `.eslintrc.json` (formato legacy, usado por el ahora deprecado
 * `next lint`) a flat config para `eslint` CLI directo, siguiendo el patrón
 * oficial de Next.js (FlatCompat sobre los presets legacy de
 * eslint-config-next, que todavía no publica sus reglas en formato flat
 * nativo). Se agrega `next/typescript` respecto a la config anterior
 * (que solo tenía `next/core-web-vitals`): suma reglas reales de
 * @typescript-eslint (ej. no-unused-vars, no-explicit-any como warning)
 * en vez de depender únicamente de `tsc --noEmit` para chequeo de tipos.
 */
const eslintConfig = [
  {
    // Flat config no hereda `.eslintignore` ni el ignore implícito de
    // `.next/` que `next lint` aplicaba solo (motivo por el que `eslint .`
    // sin esto lintea ~8000 problemas de código *compilado* en .next/,
    // no del proyecto). Mismos directorios que ya excluye .gitignore.
    ignores: ['.next/**', 'out/**', 'coverage/**', 'node_modules/**', 'next-env.d.ts', 'public/**'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // El proyecto ya usa la convención estándar de prefijar con `_` los
      // parámetros de callback intencionalmente no usados (ej. firmas
      // `Updater` compartidas en src/lib/webgl/scene/*, donde cada escena
      // solo necesita algunos de los argumentos). Sin este override, la
      // regla no reconocía esa convención ya existente y marcaba ~120
      // falsos positivos en código que ya se auto-documentaba así.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['knip.json'],
  },
]

export default eslintConfig
