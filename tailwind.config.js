/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === Cyber Shield Design System ===
        // Surface hierarchy
        surface: {
          DEFAULT: '#0c0e12',
          dim: '#0c0e12',
          bright: '#292c32',
          container: {
            lowest: '#000000',
            low: '#111318',
            DEFAULT: '#171a1f',
            high: '#1d2025',
            highest: '#23262c',
          },
          variant: '#23262c',
          tint: '#81ecff',
        },
        // Primary (Cyan)
        primary: {
          DEFAULT: '#81ecff',
          dim: '#00d4ec',
          container: '#00e3fd',
          fixed: '#00e3fd',
          'fixed-dim': '#00d4ec',
        },
        // On colors
        on: {
          surface: '#f6f6fc',
          'surface-variant': '#aaabb0',
          primary: '#005762',
          'primary-fixed': '#003840',
          background: '#f6f6fc',
        },
        // Error
        error: {
          DEFAULT: '#ff716c',
          container: '#9f0519',
          dim: '#d7383b',
        },
        // Tertiary (Green for active status)
        tertiary: {
          DEFAULT: '#c5ffc9',
          container: '#6bff8f',
          dim: '#5bf083',
        },
        // Outline
        outline: {
          DEFAULT: '#74757a',
          variant: '#46484d',
        },
        // Background
        background: '#0c0e12',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'headline-sm': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'title-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-md': ['0.875rem', { lineHeight: '1.5' }],
        'label-sm': ['0.6875rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem', // 8px = ROUND_EIGHT
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        glow: '0 0 8px rgba(129, 236, 255, 0.35)',
        'glow-green': '0 0 8px rgba(197, 255, 201, 0.5)',
        modal: '0 0 40px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #81ecff, #00d4ec)',
        'glass-sidebar': 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
      },
    },
  },
  plugins: [],
}
