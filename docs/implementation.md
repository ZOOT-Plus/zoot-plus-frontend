# 游戏选择改造（Dialog 风格）

目标：将首页「游戏」筛选从 Popover 下拉改为 Blueprint Dialog 风格，避免被高 z-index overlay 遮挡；参考现有「选择密探」对话框样式。

变更概览：
- 新增 `src/components/editor2/GameSelectDialog.tsx`：游戏对话框选择器（可复用）。
- 新增 `src/components/editor2/LevelSelectDialog.tsx`：完整“关卡选择”对话框，内部复用 `LevelSelect`，底部提供“搜索/重置”。
- 修改 `src/components/editor2/LevelSelect.tsx`：新增 `useGameDialog?: boolean`，在对话框内禁用游戏子对话框以避免嵌套。
- 修改 `src/components/LevelSelectButton.tsx`：改为打开 `LevelSelectDialog`，替换原自定义 Overlay 卡片。

接口与行为：
- Dialog 选择项点击后立即应用（重置分类与关卡输入、清空已选关卡、上抛 `onFilterChange`）。
- 对齐 bp4-dialog 样式，使用 Portal 渲染，保证不被覆盖。

回退指引：
- 首页按钮层面已改为 Dialog；若需回退为旧的下拉弹层，请将 `LevelSelectButton` 回退到早期实现或在 `LevelSelect` 中设置 `useGameDialog=false` 并恢复外层 Overlay（不推荐）。
