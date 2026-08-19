/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta "Leonida Nights": negro-ciruela profundo tipo fotografía
        // nocturna, con dos acentos neón (magenta sunset + cian Vice) y un
        // toque de oro para momentos de lujo/premium. Menos saturado que un
        // cyberpunk generico -- pensado para leerse como revista/editorial,
        // no como arcade.
        'gta-dark': '#0a0712',
        'gta-darker': '#050308',
        'gta-card': '#140f20',
        'gta-surface': '#140f20',
        'gta-surface-elevated': '#1b1430',
        'gta-border': '#2a2138',
        'gta-border-strong': '#453163',
        'gta-text': '#f5eff9',
        'gta-text-secondary': '#b3a3c4',
        // #7c6c8f original daba 4.18:1 de contraste sobre gta-dark — por debajo
        // de AA (4.5:1) para texto normal. Se usa en 14+ lugares como
        // text-xs/text-sm (metadata, timestamps, stat labels). #88799a
        // mantiene el mismo matiz violeta-gris y sube a 4.99:1.
        'gta-text-tertiary': '#88799a',
        'gta-accent': '#ff2f8f',
        'gta-accent-strong': '#ff7ec4',
        'gta-accent-orange': '#22d3ee',
        'gta-accent-warning': '#ffcc4d',
        'gta-gold': '#f0c274',
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
        'gta-sm': '0 1px 2px rgba(0, 0, 0, 0.5)',
        'gta-md': '0 4px 6px rgba(0, 0, 0, 0.6)',
        'gta-lg': '0 10px 15px rgba(0, 0, 0, 0.7)',
        'gta-xl': '0 20px 25px rgba(0, 0, 0, 0.8)',
        'glow-pink': '0 0 40px -8px rgba(255, 47, 143, 0.45)',
        'glow-cyan': '0 0 40px -8px rgba(34, 211, 238, 0.4)',
        'glow-gold': '0 0 32px -10px rgba(240, 194, 116, 0.35)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        widest: '0.28em',
      },
      backgroundImage: {
        'vice-sunset': 'linear-gradient(90deg, #ff2f8f 0%, #ff7ec4 35%, #22d3ee 70%, #0891b2 100%)',
        'vice-radial': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,47,143,0.16), transparent 60%)',
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
