/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
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
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing: {
        gutter: 'var(--gutter-width)',
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
      animation: {
        aurora: 'aurora 10s linear infinite',
        marquee: 'marquee 40s linear infinite',
        'marquee-vertical': 'marquee-vertical 40s linear infinite',
        shine: 'shine 14s linear infinite',
        gradient: 'gradient 3s ease-in-out infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#e0e0e0',
            a: {
              color: '#00d000',
              '&:hover': {
                color: '#00ff00',
              },
            },
            h1: { color: '#ffffff' },
            h2: { color: '#ffffff' },
            h3: { color: '#ffffff' },
            h4: { color: '#ffffff' },
            strong: { color: '#ffffff' },
            code: { color: '#ff6600' },
            pre: {
              backgroundColor: '#0a0a0a',
              color: '#e0e0e0',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  darkMode: 'class',
}
