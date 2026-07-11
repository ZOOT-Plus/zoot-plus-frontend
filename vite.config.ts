import path from 'path'
import { fileURLToPath } from 'url'

import react from '@vitejs/plugin-react'

import { defineConfig, loadEnv } from 'vite'

import { generateTranslations } from './scripts/generate-translations'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), generateTranslations()],
    server: {
      port: +env.PORT || undefined,
    },
    resolve: {
      tsconfigPaths: true,
      alias: {
        src: path.resolve(__dirname, 'src'),
      },
    },
    build: {
      sourcemap: false,
      // Skip the post-build gzip size report to shave a bit off build time.
      reportCompressedSize: false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'zootplusclient', test: /zoot-plus-client/ },
              { name: 'react', test: /node_modules[\\/](react|react-dom|react-router-dom)[\\/]/ },
              {
                name: 'reactplugins',
                test: /node_modules[\\/](react-use|react-rating|react-markdown|react-ga-neo|react-hook-form)[\\/]/,
              },
              { name: 'blueprint', test: /node_modules[\\/]@blueprintjs[\\/]core[\\/]/ },
              { name: 'blueprintaddon', test: /node_modules[\\/]@blueprintjs[\\/]select[\\/]/ },
              { name: 'sentry', test: /node_modules[\\/]@sentry[\\/](react|tracing)[\\/]/ },
              { name: 'dnd', test: /node_modules[\\/]@dnd-kit[\\/]/ },
              { name: 'jotai', test: /node_modules[\\/](jotai|jotai-[^\\/]+|immer)[\\/]/ },
              { name: 'remark', test: /node_modules[\\/](remark-gfm|remark-breaks)[\\/]/ },
              { name: 'iconify', test: /node_modules[\\/]@iconify[\\/]react[\\/]/ },
              { name: 'ajv', test: /node_modules[\\/](ajv|ajv-i18n)[\\/]/ },
              { name: 'linkify', test: /node_modules[\\/](linkify-react|linkifyjs)[\\/]/ },
              {
                name: 'utils',
                test: /node_modules[\\/](lodash-es|clsx|dayjs|fuse.js|mitt|swr|camelcase-keys|snakecase-keys|zod)[\\/]/,
              },
            ],
          },
        },
      },
    },
  }
})
