module.exports = {
  mode: 'jit',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        stripe: 'repeating-linear-gradient(-45deg, #f3f3f3, #f3f3f3 0.5rem, transparent 0.5rem, transparent 1rem)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
