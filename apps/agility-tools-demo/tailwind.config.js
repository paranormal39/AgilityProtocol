/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252530',
        },
        buyer: '#3b82f6',
        merchant: '#22c55e',
        courier: '#f97316',
        return: '#a855f7',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.5)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.5)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow': 'flow 1s ease-in-out',
      },
      keyframes: {
        flow: {
          '0%': { opacity: '0.3', transform: 'translateX(-10px)' },
          '50%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0.3', transform: 'translateX(10px)' },
        },
      },
    },
  },
  plugins: [],
};
