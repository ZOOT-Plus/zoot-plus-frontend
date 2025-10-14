meta.locale=zh-CN
meta.date=2025-10-12 13:16:22 (UTC+8)

# Operations Log

- 动作: 规划与任务拆分
  - 工具: sequential-thinking → mcp-router(plan_task/analyze_task/reflect_task/split_tasks/list_tasks)
  - 摘要: 生成8步计划并固化任务树与验收标准。

- 动作: 代码定位
  - 工具: serena(get_symbols_overview/find_symbol)
  - 路径: src/components/editor2/operator/OperatorSidebarFloating.tsx:17
  - 结论: 描述展示不在此组件，位于 OperatorItem 中（Button.title 与 MenuItem.title）。

- 动作: 代码读取
  - 工具: Desktop Commander read_file
  - 路径: src/components/editor2/operator/OperatorItem.tsx:136
  - 证据: MenuItem 使用 title={item.desp}；按钮 title 显示 selectedItem.desp。

- 动作: 页面复现与交互
  - 工具: Chrome DevTools
  - URL: http://localhost:3000/editor
  - 步骤: 点击“密探”→ 选择“吕布”→ 打开“命盘1”下拉 → 选择“辕门射戟 · 金”。
  - 结果: 菜单项 anchor.title 含完整描述；选择后按钮 text=“辕门射戟”，title=完整描述。
  - 控制台: 无相关错误（存在 React/Blueprint 警告，不影响功能）。

- 结论: 选取命盘后，命盘描述可正常显示（菜单项与已选按钮的 title）。

----
meta.locale=zh-CN
meta.date=2025-10-12 13:16:22 (UTC+8)

# 修复：首页关卡选择弹窗下拉被遮挡

- 现象：在首页“关卡”弹窗内，部分下拉选项被对话框底部区域/层级遮盖，无法完整点击。
- 根因：Blueprint Dialog 提升了 Overlay/Content 层级（.bp4-overlay 3000，.bp4-dialog 3002），而下拉弹层（Popover2/Suggest/Select）未显式提升层级，导致在 Portal 渲染后 z-index 仍低于对话框，出现被遮挡。

- 涉及组件：
  - 选择器封装：src/components/Select.tsx:1
  - Suggest 封装：src/components/Suggest.tsx:1
  - 关卡选择：src/components/LevelSelect.tsx:190（使用 Select）

- 最小修复：
  - 在 Select/Suggest 组件层统一强制使用 Portal 并提升 portalClassName：
    - Select.tsx：合并 popoverProps，usePortal=true，portalClassName 合并 'z-[3100]'
    - Suggest.tsx：合并 popoverProps，usePortal=true，portalClassName 合并 'z-[3100]'

- 代码片段：
  - src/components/Select.tsx:25 增加 mergedPopoverProps 并传入 Select2.popoverProps
  - src/components/Suggest.tsx:26 合并 mergedPopover，传入 Suggest2.popoverProps

- 验证：
  - DevTools 复现：http://localhost:3000 → 点击“关卡”→ 展开“关卡名、类型、编号”下拉
  - elementFromPoint 检测：命中 A.bp4-menu-item（链路含 .bp4-popover2-content），未再被 .bp4-dialog-footer 覆盖
  - 可见性与点击通过；控制台无新增错误

- 结论：提升弹层层级并强制 Portal 后，首页关卡选择弹窗下拉不再被遮挡。
