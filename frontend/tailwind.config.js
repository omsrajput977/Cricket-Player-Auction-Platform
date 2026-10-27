/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        stadium: {
          darkest: '#070A12',
          dark: '#0B0F19',
          card: '#111827',
          surface: '#1F2937',
          border: '#374151',
        },
        cricket: {
          cyan: '#06B6D4',
          gold: '#F59E0B',
          green: '#10B981',
          red: '#F43F5E',
          purple: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(6, 182, 212, 0.7)' },
        },
      },
    },
  },
  plugins: [],
};
