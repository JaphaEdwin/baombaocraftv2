/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FAF7F5',
          100: '#F2EBE5',
          200: '#E5D7CC',
          300: '#D4BFA8',
          400: '#C8A570',
          500: '#A67C52',
          600: '#8B6344',
          700: '#4A3728',
          800: '#3D2E21',
          900: '#2F231A',
        },
        accent: {
          50: '#FDF9F0',
          100: '#F9F0DC',
          200: '#F2E0B8',
          300: '#E8CC8C',
          400: '#D4B896',
          500: '#C8A570',
          600: '#B8915A',
          700: '#9A7848',
          800: '#7D6139',
          900: '#5E4A2A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
