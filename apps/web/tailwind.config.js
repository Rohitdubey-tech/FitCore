/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fitcore: {
          bg: '#101112',
          card: '#1C1F20',
          elevated: '#24282A',
          accent: '#C6FF45',
          accentHover: '#B5EE33',
          text: '#FFFFFF',
          muted: '#A1A1AA',
          border: '#303438',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

