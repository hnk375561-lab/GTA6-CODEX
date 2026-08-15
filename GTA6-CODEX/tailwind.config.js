/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal: tonos violeta-noche profundos con acentos magenta/cian (Vice City / Leonida vibe)
        'gta-dark': '#0a0118',
        'gta-darker': '#050110',
        'gta-card': '#170b2e',
        'gta-surface': '#170b2e', // superficie estándar (cards, listas)
        'gta-surface-elevated': '#1f0f3d', // superficie elevada (featured, sidebars)
        'gta-border': '#3a1d63',
        'gta-border-strong': '#5b2f96',
        'gta-text': '#fdf2ff',
        'gta-text-secondary': '#c9a6e8',
        'gta-text-tertiary': '#8a68ab',
        'gta-accent': '#ff2fb8', // Magenta neón — protagonista del nuevo look
        'gta-accent-strong': '#ff6ad5',
        'gta-accent-orange': '#00e5ff', // Cian neón secundario — contraste Vice City
        'gta-accent-warning': '#ffe135',
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
