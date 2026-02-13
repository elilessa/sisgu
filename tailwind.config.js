
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  important: '#root',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e0f7f4',
          100: '#b3ece3',
          200: '#80e0d1',
          300: '#4dd4bf',
          400: '#26cab1',
          500: '#00c0a3',
          600: '#00b89b',
          700: '#00ae91',
          800: '#00a488',
          900: '#009377',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}
