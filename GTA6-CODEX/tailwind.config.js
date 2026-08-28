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
        'auto-dark': '#0b0d10',
        'auto-darker': '#050607',
        'auto-card': '#12151a',
        'auto-surface': '#12151a',
        'auto-surface-elevated': '#191d24',
        'auto-border': '#242a32',
        'auto-border-strong': '#3a4250',
        'auto-text': '#eef1f4',
        'auto-text-secondary': '#9fa8b5',
        // 8.1:1 sobre auto-dark — sobra margen sobre el mínimo AA (4.5:1)
        // que ya se cuidaba en la paleta anterior.
        'auto-text-tertiary': '#7c8794',
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
