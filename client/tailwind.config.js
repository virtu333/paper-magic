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
        // MTG-inspired dark theme
        surface: {
          DEFAULT: '#1a1a2e',
          light: '#242442',
          lighter: '#2e2e52',
        },
        accent: {
          DEFAULT: '#c9a227',  // Gold for highlights
          muted: '#8b7355',
        },
      },
    },
  },
  plugins: [],
};
