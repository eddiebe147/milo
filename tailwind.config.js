/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pipboy: {
          green: '#00ff41',
          'green-dim': '#00cc33',
          'green-glow': 'rgba(0, 255, 65, 0.3)',
          orange: '#ff6600',
          'orange-dim': '#cc5200',
          'orange-glow': 'rgba(255, 102, 0, 0.3)',
          amber: '#ffb000',
          'amber-dim': '#cc8c00',
          'amber-glow': 'rgba(255, 176, 0, 0.3)',
          red: '#ff3333',
          'red-dim': '#cc0000',
          'red-glow': 'rgba(255, 51, 51, 0.3)',
          background: '#0a0a0a',
          surface: '#1a1a1a',
          border: '#333333',
        },
      },
      fontFamily: {
        mono: ['Share Tech Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 10px rgba(0, 255, 65, 0.3)',
        'glow-orange': '0 0 10px rgba(255, 102, 0, 0.3)',
        'glow-amber': '0 0 10px rgba(255, 176, 0, 0.3)',
        'glow-red': '0 0 10px rgba(255, 51, 51, 0.3)',
        'glow-green-lg': '0 0 20px rgba(0, 255, 65, 0.4), 0 0 40px rgba(0, 255, 65, 0.2)',
        'glow-orange-lg': '0 0 20px rgba(255, 102, 0, 0.4), 0 0 40px rgba(255, 102, 0, 0.2)',
        'glow-amber-lg': '0 0 20px rgba(255, 176, 0, 0.4), 0 0 40px rgba(255, 176, 0, 0.2)',
        'glow-red-lg': '0 0 20px rgba(255, 51, 51, 0.4), 0 0 40px rgba(255, 51, 51, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 0.15s infinite',
        'scanline': 'scanline 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'breathe': 'breathe 4s ease-in-out infinite',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '0.97' },
          '50%': { opacity: '1' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glow: {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(0.98)', opacity: '0.85' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%, 100%': { transform: 'scale(1.1)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
