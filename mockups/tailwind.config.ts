import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14213d',
        mist: '#f7f5ef',
        pine: '#2f7d5c',
        moss: '#5d8f78',
        amber: '#c27a22',
        cloud: '#edf1ea',
        soft: '#fdfcf9',
      },
      boxShadow: {
        panel: '0 20px 60px rgba(20, 33, 61, 0.08)',
        float: '0 10px 30px rgba(20, 33, 61, 0.12)',
      },
      animation: {
        rise: 'rise 0.35s ease-out',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
