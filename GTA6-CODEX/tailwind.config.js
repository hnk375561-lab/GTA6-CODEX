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
        'gta-card': '#1a1a1a',
        'gta-border': '#2d2d2d',
        'gta-text': '#e0e0e0',
        'gta-text-secondary': '#a0a0a0',
        'gta-accent': '#00d000', // Verde GTA
        'gta-accent-orange': '#ff6600', // Naranja secundario
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
