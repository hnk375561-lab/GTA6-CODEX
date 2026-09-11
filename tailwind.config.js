/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta "Placa Técnica" (sin cambios: mantiene identidad de fase anterior)
        'auto-dark': '#0b0d10',
        'auto-darker': '#050607',
        'auto-surface': '#12151a',
        'auto-border': '#242a32',
        'auto-text': '#eef1f4',
        'auto-text-secondary': '#9fa8b5',
        'auto-accent': '#ff6a1a',
        'auto-accent-strong': '#ff9152',
        'auto-accent-orange': '#3d84ff',
        'auto-accent-warning': '#ffb703',
        'auto-gold': '#c9a35f',

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
      // Rediseño "Placa Técnica" con escala aún más radical
      // (radios prácticamente rectos, para sensación brutalista/industrial)
      borderRadius: {
        sm: '0.05rem',
        DEFAULT: '0.05rem',
        md: '0.1rem',
        lg: '0.125rem',
        xl: '0.2rem',
        '2xl': '0.35rem',
      },
      // Sombras duras, offsset, sin blur — como planos técnicos remachados
      boxShadow: {
        'auto-sm': '2px 2px 0 0 rgba(0, 0, 0, 0.9)',
        'auto-md': '4px 4px 0 0 rgba(0, 0, 0, 0.9)',
        'auto-lg': '8px 8px 0 0 rgba(0, 0, 0, 0.85)',
        'auto-xl': '12px 12px 0 0 rgba(0, 0, 0, 0.8)',
        'glow-pink': '0 0 0 1px rgba(255, 106, 26, 0.55)',
        'glow-cyan': '0 0 0 1px rgba(61, 132, 255, 0.5)',
        'glow-gold': '0 0 0 1px rgba(201, 163, 95, 0.45)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        widest: '0.28em',
      },
      backgroundImage: {
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

      // === NUEVAS UTILIDADES PARA REDISEÑO RADICAL ===
      
      // Escala tipográfica extrema (títulos monumentales)
      fontSize: {
        '9xl': '8rem',
        '10xl': '10rem',
      },

      // Anchos extremos para composición asimétrica
      width: {
        'screen-lg': '120vw',
        'screen-xl': '150vw',
      },

      // Max-widths para contenedores editoriales
      maxWidth: {
        'editorial': '85rem',
        'prose-plus': '65ch',
      },

      // Espaciado brutalista (grandes saltos, no progresión lineal)
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },

      // Transiciones más lentas para scroll storytelling
      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms',
      },

      // Opacidad extrema para overlays brutales
      opacity: {
        '2': '0.02',
        '3': '0.03',
        '5': '0.05',
        '8': '0.08',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
