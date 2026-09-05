/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta "Placa Técnica" (reemplaza "Leonida Nights", agosto 2026):
        // la paleta anterior era magenta+cian neón sobre negro-ciruela —
        // en los hechos, la paleta synthwave "Vice City" del proyecto de
        // GTA6 original, sobrevivió intacta al pivote de contenido/copy.
        // Un sitio de fichas técnicas verificadas se lee mejor como una
        // placa de identificación de motor o un plano de ingeniería:
        // grafito neutro (no violeta), acento naranja señal (torque,
        // cinta de precaución de taller) para interacción/CTA, y azul
        // "plano" para datos secundarios/links — nada de glow nocturno de
        // arcade. Ver CHANGELOG.md para el detalle de la migración.
        // Fase 6 (AUDITORIA-FONDO-OSCURO-COMPLETA.md) verificó por grep
        // que estos 4 quedaron sin ningún uso real tras la Fase 5 (ni en
        // .tsx, ni como CSS var en globals.css) y se borraron:
        // auto-card, auto-surface-elevated, auto-border-strong,
        // auto-text-tertiary.
        //
        // Los que siguen abajo NO se borraron pese a estar listados en la
        // Fase 6 del documento, porque re-verificar el grep post-Fase-5
        // mostró uso real que la Fase 6 no contempló:
        // - auto-border, auto-surface, auto-text, auto-text-secondary:
        //   en uso activo en src/app/dashboard/page.tsx, que la propia
        //   Fase 5 deja oscuro a propósito (panel interno con Basic
        //   Auth). Borrarlos rompía el dashboard sin querer.
        // - auto-dark / auto-darker: en uso activo como fondo oscuro
        //   *decorativo* fuera del dashboard — overlay del hero de
        //   galería/rotating background, gradiente de leyenda sobre
        //   miniatura de video, chips/badges sobre foto (EntityCard,
        //   Header, Footer, ConsentBanner, etc.), y el
        //   .page-transition-overlay. Ninguno es "fondo de página", son
        //   el mismo tipo de uso que ya se dejó pasar en la Fase 5
        //   (ver commits de esa fase). Borrarlos rompía visualmente
        //   ~15 componentes que se mantienen así a propósito.
        'auto-dark': '#0b0d10',
        'auto-darker': '#050607',
        'auto-surface': '#12151a',
        'auto-border': '#242a32',
        'auto-text': '#eef1f4',
        'auto-text-secondary': '#9fa8b5',
        // Naranja señal: reemplaza el magenta. Es el color de interacción
        // primario (CTAs, foco, hover, links activos).
        'auto-accent': '#ff6a1a',
        'auto-accent-strong': '#ff9152',
        // Azul "plano técnico": reemplaza el cian Vice City. Se mantiene
        // el nombre de token `auto-accent-orange` para no romper los ~40
        // usos existentes en componentes; lo que cambió es el valor.
        'auto-accent-orange': '#3d84ff',
        'auto-accent-warning': '#ffb703',
        // Bronce/latón de placa remachada, más apagado que el dorado
        // "premium" anterior — encaja con metal de taller, no con joyería.
        'auto-gold': '#c9a35f',

        // Tokens semánticos de superficie y escala neutral (reingeniería
        // de dark mode, sept 2026). Los VALORES viven en
        // src/app/globals.css como CSS custom properties (`--color-*`):
        // `:root` define el tema claro (idéntico al estado pre-dark-mode)
        // y `.dark` el tema oscuro — diseñado por jerarquía de superficies
        // y luminancia, no una inversión de colores. Cada token usa el
        // patrón de tripleta RGB + `<alpha-value>` para que los
        // modificadores de opacidad de Tailwind (`/70`, `/10`, `/20` …)
        // sigan generando `rgb(var(--color-x) / 0.7)` en vez de romper
        // (ver AUDITORIA-FONDO-OSCURO-COMPLETA.md: la Opción B con
        // `var(--x)` directo DROPA las clases con opacidad). Los tokens
        // de glass con alpha horneado (header/drawer/chip) se referencian
        // sin `<alpha-value>`: su transparencia es parte del valor.
        neutral: {
          50: 'rgb(var(--color-neutral-50) / <alpha-value>)',
          100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
          200: 'rgb(var(--color-neutral-200) / <alpha-value>)',
          300: 'rgb(var(--color-neutral-300) / <alpha-value>)',
          400: 'rgb(var(--color-neutral-400) / <alpha-value>)',
          500: 'rgb(var(--color-neutral-500) / <alpha-value>)',
          600: 'rgb(var(--color-neutral-600) / <alpha-value>)',
          700: 'rgb(var(--color-neutral-700) / <alpha-value>)',
          800: 'rgb(var(--color-neutral-800) / <alpha-value>)',
          900: 'rgb(var(--color-neutral-900) / <alpha-value>)',
          950: 'rgb(var(--color-neutral-950) / <alpha-value>)',
        },
        'surface-page': 'rgb(var(--color-surface-page) / <alpha-value>)',
        'surface-alt': 'rgb(var(--color-surface-alt) / <alpha-value>)',
        'surface-card': 'rgb(var(--color-surface-card) / <alpha-value>)',
        'surface-card-hover': 'rgb(var(--color-surface-card-hover) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        'surface-input': 'rgb(var(--color-surface-input) / <alpha-value>)',
        'surface-header': 'rgb(var(--color-surface-header))',
        'surface-drawer': 'rgb(var(--color-surface-drawer))',
        'surface-chip': 'rgb(var(--color-surface-chip))',
        'inverse': 'rgb(var(--color-inverse) / <alpha-value>)',
        'edge': 'rgb(var(--color-edge) / <alpha-value>)',
        'edge-strong': 'rgb(var(--color-edge-strong) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        display: [
          'var(--font-display)',
          'var(--font-sans)',
          '-apple-system',
          'sans-serif',
        ],
        mono: [
          'var(--font-mono)',
          '"Fira Code"',
          '"Courier New"',
          'monospace',
        ],
      },
      borderRadius: {
        sm: '0.3rem',
        DEFAULT: '0.5rem',
        md: '0.65rem',
        lg: '0.9rem',
        xl: '1.25rem',
        '2xl': '1.75rem',
      },
      boxShadow: {
        'auto-sm': '0 1px 2px rgba(0, 0, 0, 0.5)',
        'auto-md': '0 4px 6px rgba(0, 0, 0, 0.6)',
        'auto-lg': '0 10px 15px rgba(0, 0, 0, 0.7)',
        'auto-xl': '0 20px 25px rgba(0, 0, 0, 0.8)',
        // Nombres de key sin tocar (evita renombrar clases en ~15
        // componentes); los valores pasan de glow neón a un resplandor
        // corto y contenido, más "indicador LED de panel" que "cartel de
        // neón nocturno".
        'glow-pink': '0 0 24px -6px rgba(255, 106, 26, 0.5)',
        'glow-cyan': '0 0 24px -6px rgba(61, 132, 255, 0.45)',
        'glow-gold': '0 0 20px -8px rgba(201, 163, 95, 0.4)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        widest: '0.28em',
      },
      backgroundImage: {
        // 'auto-sunset' pasa de magenta->cian (paleta Vice City) a
        // naranja->azul plano (paleta actual). 'vice-radial' se mantiene
        // como nombre de key por compatibilidad con las clases existentes,
        // pero ya no referencia nada de Vice City en valor ni en uso.
        'auto-sunset': 'linear-gradient(90deg, #ff6a1a 0%, #ff9152 35%, #3d84ff 70%, #1c4fd6 100%)',
        'vice-radial': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,106,26,0.13), transparent 60%)',
      },
      aspectRatio: {
        'square': '1 / 1',
        'video': '16 / 9',
        '4/5': '4 / 5',
        '5/4': '5 / 4',
        '3/2': '3 / 2',
        '2/3': '2 / 3',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
