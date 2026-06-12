/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#04080f', 900: '#070f1c', 850: '#0b1929',
          800: '#0f2033', 750: '#142b44', 700: '#1a3552',
          600: '#223f61', 500: '#2a4d75',
        },
        teal: {
          700: '#1d6a75', 600: '#2a7f8a', 500: '#3d9baa',
          400: '#5bb5c4', 300: '#93d4de', 200: '#c8edf3',
        },
        gold: '#d4a017',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.04)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pricePop: {
          '0%': { transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        'border-beam': {
          '100%': { 'offset-distance': '100%' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s infinite',
        float: 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'price-pop': 'pricePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'fade-in': 'fade-in 0.7s ease-out forwards',
      },
    },
  },
  plugins: [],
}
