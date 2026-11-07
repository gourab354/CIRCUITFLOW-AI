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
        pcb: {
          dark: '#0b0f19',
          sidebar: '#0d1322',
          panel: '#131b2e',
          card: '#182238',
          border: '#23304c',
          accent: '#38bdf8',
          green: '#10b981',
          copper: '#e07a38',
          via: '#facc15'
        }
      }
    },
  },
  plugins: [],
}

