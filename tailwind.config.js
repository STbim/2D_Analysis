/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eefcfd',
          100: '#d3f6f9',
          200: '#ace9f0',
          300: '#73d6e3',
          400: '#33b8cd',
          500: '#179bb3',
          600: '#157d97',
          700: '#17647b',
          800: '#1a5365',
          900: '#1a4656',
          950: '#0a2c39',
        },
        ink: {
          50:  '#f7f8fa',
          100: '#eef1f5',
          200: '#dfe4ec',
          300: '#c6cdd9',
          400: '#9aa4b5',
          500: '#6b7588',
          600: '#515a6b',
          700: '#3f4756',
          800: '#2b313c',
          900: '#1a1e26',
        },
      },
      boxShadow: {
        panel: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        float: '0 4px 16px rgba(16, 24, 40, 0.08), 0 2px 6px rgba(16, 24, 40, 0.05)',
      },
    },
  },
  plugins: [],
}
