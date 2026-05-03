/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#08060f',
        'amber-stellaeum': '#fbbf24',
        'violet-stellaeum': '#8b5cf6',
      },
      fontFamily: {
        cinzel: ['Cinzel'],
        display: ['EB Garamond'],
      },
    },
  },
  plugins: [],
}
