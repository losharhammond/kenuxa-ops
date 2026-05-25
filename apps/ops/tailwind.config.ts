import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg:      '#050508',
          surface: '#0d0d14',
          border:  '#1a1a2e',
          accent:  '#10b981', // emerald — voice active
          ai:      '#6366f1', // indigo — AI response
          warn:    '#f59e0b', // amber — alert
          error:   '#ef4444', // red — error
        },
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':   'spin 3s linear infinite',
        'waveform':    'waveform 1.2s ease-in-out infinite',
        'orb-breathe': 'orb-breathe 2.5s ease-in-out infinite',
      },
      keyframes: {
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%':      { transform: 'scaleY(1)' },
        },
        'orb-breathe': {
          '0%, 100%': { boxShadow: '0 0 20px 4px rgba(16,185,129,0.25)' },
          '50%':      { boxShadow: '0 0 60px 16px rgba(16,185,129,0.5)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
