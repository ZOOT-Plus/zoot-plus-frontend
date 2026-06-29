import path from 'path'
import { fileURLToPath } from 'url'

import react from '@vitejs/plugin-react'

import { defineConfig, loadEnv } from 'vite'

import { generateTranslations } from './scripts/generate-translations'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// TODO(blueprint-v6 / @popperjs/core 补丁): 移除 patches/@popperjs__core@2.11.8.patch
// 当前 Rolldown(Vite 8 打包器）在 app 打包下无法解析 @popperjs/core 经 `export *` 重导出、
// 且带 `/*#__PURE__*/` 注解的 `placements`，导致 Blueprint v6 legacy Popover 的
// `export { placements as PopperPlacements }` 构建失败（MISSING_EXPORT）。
// 注意：rolldown#9122/#9958 只修了 preserveModules 库模式（已在 1.1.3 中，但不覆盖本场景）。
// 待 Rolldown 发布覆盖 app-bundle export* 的修复后：删除上面的 patch 条目 +
// `package.json` 里的 pnpm.patchedDependencies，重新 `pnpm install && pnpm build` 验证即可。

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
              { name: 'maacopilot', test: /maa-copilot-client/ },
              { name: 'react', test: /node_modules[\\/](react|react-dom|react-router-dom)[\\/]/ },
              {
                name: 'reactplugins',
                test: /node_modules[\\/](react-use|react-rating|react-markdown|react-ga-neo|react-hook-form)[\\/]/,
              },
              { name: 'blueprint', test: /node_modules[\\/]@blueprintjs[\\/]core[\\/]/ },
              { name: 'blueprintaddon', test: /node_modules[\\/]@blueprintjs[\\/]select[\\/]/ },
              { name: 'sentry', test: /node_modules[\\/]@sentry[\\/](react|tracing)[\\/]/ },
              { name: 'dnd', test: /node_modules[\\/]@dnd-kit[\\/]/ },
              { name: 'jotai', test: /node_modules[\\/](jotai|immer)[\\/]/ },
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
