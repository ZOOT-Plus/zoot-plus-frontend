# zoot-plus-frontend

ZOOT Plus 前端！

## 文档

- ~~后端接口文档~~ (暂无，请参考 [zoot-plus-client](https://github.com/ZOOT-Plus/zoot-plus-client-ts) 的 TS 类型，或者从后端 [Actions](https://github.com/ZOOT-Plus/ZootPlusBackend/actions/workflows/openapi.yml) 的 Artifacts 里下载最新的 OpenAPI 文档)
- 作业格式：[战斗流程协议](https://maa.plus/docs/zh-cn/protocol/copilot-schema.html)
- i18n：[i18n/README.md](src/i18n/README.md)

更新 zoot-plus-client 时，需要在 [Tags](https://github.com/ZOOT-Plus/zoot-plus-client-ts/tags) 中复制版本号，然后替换掉 `package.json` 中的 `maa-copilot-client` 版本号，再运行 `yarn` 安装依赖

## 开发流程

该仓库的主分支为 `dev`，线上分支为 `main`，代码合并到 `main` 后将会自动部署到线上

在自己的 fork 上开发完成后请提交 PR 到 `dev` 分支，由管理员合并

如果有该仓库的权限，可以直接在 `dev` 分支上开发，需要上线时提交 PR 到 `main` 分支，并等待其他成员的 review

## 环境变量

环境变量定义在 `.env` `.dev.development` 文件内

你可以创建 `.env.development.local` 文件来覆盖环境变量，优先级为 `.env.development.local` > `.env.development` > `.env`

可用环境变量示例：

- `VITE_API`：后端接口地址，例如 `http://127.0.0.1:8848`
- `VITE_THERESA_SERVER`：地图站地址
- `VITE_SIMING_BASE_URL`：MaaYuan-SiMing 生成器服务地址
- `VITE_USE_REG_CODE`：是否启用“注册码注册”模式（`true`/`false`，默认 `false`）。启用后注册页将显示“注册码”输入框并隐藏“发送验证码”按钮，注册请求体将携带 `registrationCode` 字段；关闭时沿用邮箱验证码流程，注册请求体携带 `registrationToken` 字段。

## 命令

安装依赖

```bash
yarn
```

运行开发服务器

```bash
yarn dev
```

本地构建

```bash
yarn build
```

Lint fix

```bash
yarn lint:fix
```

## Join us!

QQ Group: 724540644

## 首页滚动广告栏（公告区改造）

- 广告配置文件：`src/data/ad-banners.ts`
- 每个广告项包含：
  - `image`: 图片路径（建议放在 `public/`，尺寸 560x320，或更大按 `object-fit: cover` 裁切）
  - `link`: 点击跳转链接（将在新窗口打开）
  - `alt` : 可选，图片替代文本
- 组件：`src/components/AdBannerCarousel.tsx`
- 首页引用：`src/pages/index.tsx`（移动端与桌面端均显示）
