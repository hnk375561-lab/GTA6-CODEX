/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta "Archivo Automotor Verificado"
        'paper': '#F4F1EA',
        'ink': '#14110C',
        'border': '#E4DFD3',
        'oxide-red': '#B23A24',
        'archive-green': '#2B4436',

        // Paleta "auto-*" (Placa Técnica / dark mode) — convive con la
        // paleta "Archivo" (paper/ink/oxide-red) de arriba. Se restauran
        // estos tokens porque siguen en uso activo en ~90 archivos de
        // src/* (Footer, WishlistButton, Badge, SearchClient, chips/badges
        // sobre foto, overlays oscuros, etc.) aunque no formen parte del
        // rediseño "Archivo Automotor" de la home. Ver commit 7d0afcb7
        // para el detalle histórico de esta paleta.
        'auto-dark': '#0b0d10',
        'auto-darker': '#050607',
        'auto-surface': '#12151a',
        'auto-border': '#242a32',
        'auto-text': '#eef1f4',
        'auto-text-secondary': '#9fa8b5',
        'auto-accent': '#B23A24',
        'auto-accent-strong': '#CC4A30',
        'auto-accent-orange': '#3d84ff',
        'auto-accent-warning': '#ffb703',
        'auto-gold': '#c9a35f',
        
        // Colores neutrales derivados
        neutral: {
          50: '#FAFAF8',
          100: '#F5F3EF',
          200: '#EBE8E0',
          300: '#D9D4C8',
          400: '#C4BDB0',
          500: '#A89E8E',
          600: '#8A8172',
          700: '#6B6356',
          800: '#4F4940',
          900: '#36332E',
          950: '#1A1917',
        },
        
        // Colores de superficie
        'surface-page': '#F4F1EA',
        'surface-alt': '#EBE8E0',
        'surface-card': '#FFFFFF',
        'surface-card-hover': '#F5F3EF',
        'surface-elevated': '#FFFFFF',
        'surface-input': '#FFFFFF',
        'surface-header': '#F4F1EA',
        'surface-drawer': '#FFFFFF',
        'surface-chip': '#FFFFFF',
        'inverse': '#14110C',
        'edge': '#E4DFD3',
        'edge-strong': '#C4BDB0',
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        serif: [
          'var(--font-serif)',
          'Georgia',
          'Times New Roman',
          'serif',
        ],
        display: [
          'var(--font-display)',
          'var(--font-serif)',
          'Georgia',
          'serif',
        ],
        mono: [
          'var(--font-mono)',
          '"Fira Code"',
          '"Courier New"',
          'monospace',
        ],
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(20, 17, 12, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(20, 17, 12, 0.1)',
        'md': '0 4px 6px -1px rgba(20, 17, 12, 0.1)',
        'lg': '0 10px 15px -3px rgba(20, 17, 12, 0.1)',
        'xl': '0 20px 25px -5px rgba(20, 17, 12, 0.1)',
        'auto-sm': '0 1px 2px rgba(0, 0, 0, 0.5)',
        'auto-md': '0 4px 6px rgba(0, 0, 0, 0.6)',
        'auto-lg': '0 10px 15px rgba(0, 0, 0, 0.7)',
        'auto-xl': '0 20px 25px rgba(0, 0, 0, 0.8)',
      },
      letterSpacing: {
        'tightest': '-0.04em',
        'tighter': '-0.02em',
        'tight': '-0.01em',
        'normal': '0em',
        'wide': '0.02em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
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
