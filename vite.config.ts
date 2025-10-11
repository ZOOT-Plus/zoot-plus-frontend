import react from '@vitejs/plugin-react'

import { defineConfig, loadEnv } from 'vite'
import viteTsconfigPath from 'vite-tsconfig-paths'

import { generateTranslations } from './scripts/generate-translations'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), viteTsconfigPath(), generateTranslations()],
    server: {
      port: +env.PORT || undefined,
    },
    resolve: {
      alias: {
        src: require('path').resolve(__dirname, 'src'),
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            maacopilot: ['maa-copilot-client'],
            react: ["react", "react-dom", "react-router-dom"],
            reactplugins: ["react-use", "react-rating", "react-markdown", "react-ga-neo", "react-hook-form"],
            blueprint: ["@blueprintjs/core"],
            blueprintaddon: ["@blueprintjs/select", "@blueprintjs/popover2"],
            sentry: ["@sentry/react", "@sentry/tracing"],
            dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
            jotai: ["jotai", "jotai-immer", "jotai-devtools", "immer"],
            remark: ["remark-gfm", "remark-breaks"],
            iconify: ["@iconify/react"],
            ajv: ["ajv", "ajv-i18n"],
            linkify: ['linkify-react', 'linkifyjs'],
            utils: [
              "lodash-es",
              "clsx",
              "dayjs",
              "fuse.js",
              "mitt",
              "swr",
              "swr/infinite",
              "camelcase-keys",
              "snakecase-keys",
              "zod"
            ],
          },
        }
      }
    },
  }
})
