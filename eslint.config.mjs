import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * Hasta eslint-config-next@15.x, el paquete solo publicaba presets en
 * formato legacy (`.eslintrc`), por eso este archivo pasaba
 * 'next/core-web-vitals' y 'next/typescript' por `FlatCompat` (patrón
 * oficial de Next.js para adaptar config legacy a flat config).
 *
 * Desde eslint-config-next@16.x el paquete exporta flat config nativo
 * (`eslint-config-next/core-web-vitals` y `eslint-config-next/typescript`
 * son arrays de `Linter.Config` listos para usar, ver
 * node_modules/eslint-config-next/dist/*.d.ts). Con la v16 instalada,
 * seguir usando `FlatCompat.extends(...)` sobre estos presets ya-flat
 * rompía: el validador de config legacy de @eslint/eslintrc no sabe
 * procesar los plugins flat que trae la v16 y tira
 * "Converting circular structure to JSON" al pisarse las referencias
 * entre `eslint-plugin-react` y sus propios configs. Importar los
 * presets flat nativos directamente evita ese paso de conversión
 * innecesario.
 */
const eslintConfig = [
  {
    // Flat config no hereda `.eslintignore` ni el ignore implícito de
    // `.next/` que `next lint` aplicaba solo (motivo por el que `eslint .`
    // sin esto lintea ~8000 problemas de código *compilado* en .next/,
    // no del proyecto). Mismos directorios que ya excluye .gitignore.
    ignores: ['.next/**', 'out/**', 'coverage/**', 'node_modules/**', 'next-env.d.ts', 'public/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
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
