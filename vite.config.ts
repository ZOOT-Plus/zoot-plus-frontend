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
      server:"0.0.0.0",
      allowedHosts: true
    },
    resolve: {
      alias: {
        src: require('path').resolve(__dirname, 'src'),
        // 明确指向 ESM 入口，避免某些环境下包入口解析失败
        'maa-copilot-client': 'maa-copilot-client/dist/esm/index.js',
      },
    },
    build: {
      sourcemap: false,
    },
  }
})
