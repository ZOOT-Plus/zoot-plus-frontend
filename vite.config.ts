import path from 'path'
import { fileURLToPath } from 'url'

import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { defineConfig, loadEnv } from 'vite'

import { generateTranslations } from './scripts/generate-translations.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  if (!env.VITE_API) {
    throw new Error('env var VITE_API is not set')
  }
  // /arknights/level/v2 内容端点的源（SW 运行时缓存路由用，见下方 runtimeCaching）。
  // 转义后内嵌进正则 source，构建时固化进 sw.js
  const levelV2OriginPattern = new RegExp(
    `^${new URL(env.VITE_API).origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/arknights/level/v2\\?`,
  )

  return {
    plugins: [
      react(),
      generateTranslations(),
      VitePWA({
        registerType: 'prompt',
        // 零预缓存：install 只下载 sw.js 本身，一切资源运行时按需缓存（见 workbox.runtimeCaching）。
        // 项目强依赖服务器通信，不做离线兜底：导航请求不配路由、navigateFallback 显式关闭。
        // includeManifestIcons 默认 true 会把 manifest 图标追加进预缓存清单，须一并关闭
        includeManifestIcons: false,
        // 自 public/site.webmanifest 迁入（原文件与 index.html 手写 link 已删，由插件注入）
        manifest: {
          name: 'PRTS Plus',
          short_name: 'PRTS+',
          icons: [
            { src: '/android-chrome-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
            { src: '/android-chrome-512x512.png?v=2', sizes: '512x512', type: 'image/png' },
          ],
          theme_color: '#101010',
          background_color: '#101010',
        },
        workbox: {
          globPatterns: [],
          // 必须显式置 undefined 覆盖插件默认的 'index.html'（Object.assign 浅合并，显式 undefined
          // 可覆盖默认值）：该默认要求回退页存在于预缓存清单中，空清单下 SW 运行时会抛错
          navigateFallback: undefined,
          runtimeCaching: [
            // 同源静态资源（哈希 chunk、干员头像、职业图标）：哈希文件名即内容寻址，CacheFirst
            // 命中后不再回源；无哈希的头像靠 30 天 LRU 过期兜底；200 过滤防止旧部署已删除的
            // chunk 把 404 写进缓存
            {
              urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/assets/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'assets',
                expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
                cacheableResponse: { statuses: [200] },
              },
            },
            // cdnjs 全域：当前仅 index.html 引用的 github-markdown CSS（SRI 固定版本），
            // 有意保持全域匹配——未来新增的 cdnjs 脚本/字体等同样受益；缓存名与容量
            // 上限按通用资源设定（当前 1 个资源，maxEntries 20 由 LRU 兜底）
            {
              urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdnjs',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
                cacheableResponse: { statuses: [200] },
              },
            },
            // /arknights/level/v2 内容端点：URL 带版本号即内容寻址，CacheFirst 安全——版本变化
            // = URL 变化 = 缓存未命中走网络，旧条目由 maxEntries 淘汰。
            // /version 探测端点不配路由，保证版本号新鲜
            {
              urlPattern: levelV2OriginPattern,
              handler: 'CacheFirst',
              options: {
                cacheName: 'ark-level-v2',
                expiration: { maxEntries: 6 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
      }),
    ],
    server: {
      host: '127.0.0.1',
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
