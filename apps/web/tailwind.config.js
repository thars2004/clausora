/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#1E1B4B',
          dark: '#0B0F19',
          surface: '#111827',
          card: '#1F2937'
        },
        ai: {
          light: '#F5F3FF',
          DEFAULT: '#8B5CF6',
          dark: '#7C3AED',
          glow: 'rgba(139, 92, 246, 0.15)'
        },
        paypal: {
          blue: '#0070BA',
          dark: '#003087',
          gold: '#FFC439'
        },
        status: {
          verified: '#10B981',
          pending: '#F59E0B',
          revision: '#EF4444',
          disputed: '#DC2626'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
