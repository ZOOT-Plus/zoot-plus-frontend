import autoprefixer from 'autoprefixer'
import postcssImport from 'postcss-import'
import tailwindcss from 'tailwindcss'
import tailwindNesting from 'tailwindcss/nesting/index.js'

export default {
  plugins: [postcssImport(), tailwindNesting(), tailwindcss(), autoprefixer()],
}
