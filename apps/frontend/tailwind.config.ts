import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0A0D14',
          surface: '#151A23',
          secondary: '#1F2633',
          border: '#2D3748',
          text: '#FFFFFF',
          muted: '#8B949E',
          neutral: '#4A5568',
        },
        accent: {
          DEFAULT: '#C4F82A',
          hover: '#D6FB4D',
          muted: '#A5D619',
          glow: 'rgba(196, 248, 42, 0.2)',
          dark: '#142308',
        },
        brand: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6969',
          500: '#f83b3b',
          600: '#e51d1d',
          700: '#c11414',
          800: '#9f1414',
          900: '#841717',
          950: '#480707',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
