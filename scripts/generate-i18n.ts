// 独立生成 i18n 文件（src/i18n/generated），供 tsc / CI 在未经 vite 构建时使用。
// 平时 dev/build 由 vite 插件 generateTranslations 自动生成；此脚本用于 typecheck。
import { splitTranslations } from './generate-translations'

splitTranslations()
