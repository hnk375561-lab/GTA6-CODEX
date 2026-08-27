/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta minimalista en escala de grises: negro casi puro de fondo,
        // texto casi blanco, y acentos que ahora son distintos tonos de
        // gris (antes magenta/cian/oro neón) en vez de color. Cada token
        // conserva su luminancia relativa original -- se hizo una
        // conversión a escala de grises preservando el brillo percibido de
        // cada color, no un reemplazo arbitrario -- así toda la jerarquía
        // visual (qué se ve "más fuerte" que qué) se mantiene igual, solo
        // que sin saturación. Pensado para leerse tranquilo y editorial.
        'auto-dark': '#090909',
        'auto-darker': '#040404',
        'auto-card': '#121212',
        'auto-surface': '#121212',
        'auto-surface-elevated': '#191919',
        'auto-border': '#262626',
        'auto-border-strong': '#3d3d3d',
        'auto-text': '#f2f2f2',
        'auto-text-secondary': '#acacac',
        // #757575 original daba 4.18:1 de contraste sobre auto-dark — por debajo
        // de AA (4.5:1) para texto normal. Se usa en 14+ lugares como
        // text-xs/text-sm (metadata, timestamps, stat labels). #818181
        // mantiene el mismo matiz violeta-gris y sube a 4.99:1.
        'auto-text-tertiary': '#818181',
        'auto-accent': '#787878',
        'auto-accent-strong': '#adadad',
        'auto-accent-orange': '#a1a1a1',
        'auto-accent-warning': '#cdcdcd',
        'auto-gold': '#c7c7c7',
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
        'glow-pink': '0 0 40px -8px rgba(120, 120, 120, 0.28)',
        'glow-cyan': '0 0 40px -8px rgba(161, 161, 161, 0.24)',
        'glow-gold': '0 0 32px -10px rgba(199, 199, 199, 0.22)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        widest: '0.28em',
      },
      backgroundImage: {
        'auto-sunset': 'linear-gradient(90deg, #787878 0%, #adadad 35%, #a1a1a1 70%, #6c6c6c 100%)',
        'vice-radial': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(120,120,120,0.12), transparent 60%)',
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
