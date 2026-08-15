/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal: tonos oscuros sofisticados con acentos de verde y naranja (GTA feel)
        'gta-dark': '#0f0f0f',
        'gta-darker': '#050505',
        'gta-card': '#161616',
        'gta-surface': '#161616', // superficie estándar (cards, listas)
        'gta-surface-elevated': '#1c1c1c', // superficie elevada (featured, sidebars)
        'gta-border': '#262626',
        'gta-border-strong': '#333333',
        'gta-text': '#f2f2f0',
        'gta-text-secondary': '#a3a3a0',
        'gta-text-tertiary': '#6b6b68',
        'gta-accent': '#22c55e', // Verde GTA — uso estratégico, no dominante
        'gta-accent-strong': '#4ade80',
        'gta-accent-orange': '#ff6600', // Naranja secundario — uso muy controlado
        'gta-accent-warning': '#ffaa00',
      },
      fontFamily: {
        // Tipografía premium y editorial
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Roboto"',
          '"Oxygen"',
          '"Ubuntu"',
          '"Cantarell"',
          'sans-serif',
        ],
        mono: [
          '"Fira Code"',
          '"Courier New"',
          'monospace',
        ],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        'gta-sm': '0 1px 2px rgba(0, 0, 0, 0.5)',
        'gta-md': '0 4px 6px rgba(0, 0, 0, 0.6)',
        'gta-lg': '0 10px 15px rgba(0, 0, 0, 0.7)',
        'gta-xl': '0 20px 25px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
