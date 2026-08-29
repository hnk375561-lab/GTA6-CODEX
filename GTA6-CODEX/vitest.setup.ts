// Registra los matchers de `@testing-library/jest-dom` (`toBeInTheDocument`,
// `toHaveAttribute`, etc.) globalmente para todos los tests. Es un no-op en
// los tests de `src/lib/*.test.ts` (entorno `node`, sin DOM): jest-dom no
// exige un `document` para importarse, solo para que sus matchers se usen.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// `@testing-library/react` solo registra su cleanup automático entre tests
// si detecta un `afterEach` global de estilo Jest (`test.globals: true` en
// la config) — acá `globals` está deliberadamente apagado (ver
// `vitest.config.mts`), así que sin esto el DOM de un `render()` quedaba
// montado para el siguiente test del mismo archivo: dos `it()` que
// renderizan el mismo componente terminaban viendo el markup de ambos
// renders a la vez ("Found multiple elements with the text: ...").
afterEach(() => {
  cleanup()
})

// jsdom no implementa `window.matchMedia` (no hay motor de layout real
// detrás), así que cualquier componente del hero que lo use en su primer
// efecto (`RotatingHeroBackground`, `HeroNewsFlash`, `CountUp`, ...) explota
// con "matchMedia is not a function" apenas se monta en un test, incluso en
// los que no tienen nada que ver con reduced-motion. Se stubea acá, una sola
// vez, con un `MediaQueryList` mínimo que siempre reporta "no coincide"
// (`matches: false`) — los tests que sí necesitan simular reduced-motion u
// otra media query lo sobreescriben puntualmente con `vi.stubGlobal`.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

