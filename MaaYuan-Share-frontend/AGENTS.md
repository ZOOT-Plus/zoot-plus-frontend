# Repository Guidelines

## Project Structure & Module Organization
- App code lives in `src/`:
  - `pages/` (route pages, e.g., `src/pages/create.tsx`), `components/` (UI, PascalCase), `layouts/`, `features/`, `store/` (Jotai atoms), `apis/` (API clients), `services/`, `utils/`, `i18n/`, `assets/`, `styles/`.
- Public assets in `public/`; build output in `dist/`.
- Vite + React + TypeScript; TailwindCSS; ESLint + Prettier.

## Build, Test, and Development Commands
- Install deps: `yarn`
- Start dev server: `yarn dev`
- Build (with type-check): `yarn build` (runs `tsc && vite build`)
- Build (skip type-check): `yarn build:skiptsc`
- Preview build: `yarn preview`
- Lint check: `yarn lint`
- Lint fix: `yarn lint:fix`
- Data scripts (examples): `yarn scripts:update` (operators, avatars, prof icons)

## Coding Style & Naming Conventions
- TypeScript, 2 spaces, single quotes, no semicolons (Prettier: `singleQuote=true`, `semi=false`, `trailingComma=all`).
- Import sorting via `@trivago/prettier-plugin-sort-imports` with defined `importOrder`.
- ESLint presets: React, Hooks, TypeScript, Prettier, a11y, import. Key rules: `eqeqeq=error`, `react/self-closing-comp=error`, `react-hooks/exhaustive-deps=error`.
- Filenames: components `PascalCase.tsx`; utilities/hooks `camelCase.ts/tsx`; pages lower-case (e.g., `editor.tsx`).

## Testing Guidelines
- No test runner is configured yet. If adding tests for new logic, prefer Vitest + React Testing Library, colocated as `*.test.ts(x)` next to source.
- Keep tests fast and deterministic; mock network boundaries in `src/apis/`.

## Commit & Pull Request Guidelines
- Branching: work on `dev`; deploys from `main`. Open PRs into `dev` (or `main` when releasing) with clear description, linked issues, and screenshots for UI changes.
- Conventional Commits (examples):
  - `feat: 新增操作集筛选器`
  - `fix: 修复编辑器保存时崩溃`
  - `chore: 更新依赖与头像资源`

## Security & Configuration Tips
- Env files: `.env`, `.env.development`, override with `.env.development.local` (higher priority). Do not commit secrets.
- Sentry/react is included—guard PII, sanitize logs.

## Agent-Specific Instructions
- Scope changes to `src/` and follow ESLint/Prettier; do not reformat unrelated files.
- Keep components focused (SRP), avoid premature abstractions (YAGNI), and deduplicate utilities (DRY).

