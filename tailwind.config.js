/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midi: {
          bg:      '#0a0f1e',
          card:    '#101828',
          accent:  '#4b8ef8',
          accent2: '#1d4ed8',
          good:    '#22c55e',
          bad:     '#ef4444',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(0.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
        glow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(75,142,248,0.5)' }, '50%': { boxShadow: '0 0 28px 6px rgba(75,142,248,0.55)' } },
      },
      animation: {
        pop: 'pop 0.25s ease-out',
        shake: 'shake 0.3s ease-in-out',
        glow: 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
