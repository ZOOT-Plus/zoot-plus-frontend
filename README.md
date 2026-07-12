# zoot-plus-frontend

ZOOT Plus 前端！

## 文档

- ~~后端接口文档~~ (暂无，请参考 [zoot-plus-client](https://github.com/ZOOT-Plus/zoot-plus-client-ts) 的 TS 类型，或者从后端 [Actions](https://github.com/ZOOT-Plus/ZootPlusBackend/actions/workflows/openapi.yml) 的 Artifacts 里下载最新的 OpenAPI 文档)
- 作业格式：[战斗流程协议](https://maa.plus/docs/zh-cn/protocol/copilot-schema.html)
- i18n：[i18n/README.md](src/i18n/README.md)

更新 zoot-plus-client 时，需要在 [Tags](https://github.com/ZOOT-Plus/zoot-plus-client-ts/tags) 中复制版本号，然后替换掉 `package.json` 中的 `zoot-plus-client` 版本号，再运行 `pnpm install` 安装依赖

## 开发流程

该仓库的主分支为 `dev`，线上分支为 `main`，代码合并到 `main` 后将会自动部署到线上

在自己的 fork 上开发完成后请提交 PR 到 `dev` 分支，由管理员合并

如果有该仓库的权限，可以直接在 `dev` 分支上开发，需要上线时提交 PR 到 `main` 分支，并等待其他成员的 review

## 环境变量

环境变量定义在 `.env` `.dev.development` 文件内

你可以创建 `.env.development.local` 文件来覆盖环境变量，优先级为 `.env.development.local` > `.env.development` > `.env`

## 命令

安装依赖

```bash
pnpm install
```

运行开发服务器

```bash
pnpm dev
```

本地构建

```bash
pnpm build
```

Lint fix

```bash
pnpm lint:fix
```

## Join us!

QQ Group: 724540644
