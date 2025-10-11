meta.locale=zh-CN
meta.date=2025-10-10 22:34:54 (UTC+8)

# 操作日志（editorv2 密探按钮迁移）

- 目标：将 editorv2 页面“密探”按钮内联到“作业信息”中，并展示已选密探。

变更摘要：
- 新增内联触发组件：`src/components/editor2/operator/OperatorSidebarInInfo.tsx`
- 在“作业信息”中引入按钮与展示：`src/components/editor2/InfoEditor.tsx`
  - 导入 `Tag`、`OperatorSidebarInInfo`、`OperatorAvatar`
  - 渲染“密探”按钮与已选密探头像（位于“关卡”下一行，头像 48px，sourceSize=96）
  - 调整顺序：按钮移至头像右侧（同一行）
- 移除原移动端悬浮入口：`src/components/editor2/Editor.tsx`
  - 删除 `OperatorSidebarFloating` 渲染，避免重复入口

验证要点：
- 在“作业信息”中可看到“密探”按钮，点击可弹出侧栏（OperatorSheet + OperatorEditor）
- 已选密探以标签形式展示；当为空时显示“暂无密探”

文件引用：
- src/components/editor2/operator/OperatorSidebarInInfo.tsx:1
- src/components/editor2/InfoEditor.tsx:16
- src/components/editor2/Editor.tsx:1
- meta.locale=zh-CN
- meta.date=2025-10-11 18:28:22
- action: 修改 SourceEditor 默认展示模式，避免抽屉初开触发 Siming 远端生成并显示错误
- tool: Desktop Commander edit_block
- files:
  - src/components/editor2/source/SourceEditor.tsx: 默认 viewMode 从 'siming' 改为 'maa'
- rationale: KISS 最小改动；仅在用户显式切换到“司命格式”时才请求远端，打开抽屉或无载荷时不再显示“Siming生成接口失败”
- result: 抽屉初次打开不显示该错误；仅用户切换“司命格式”视图时若失败才显示

---
meta.locale=zh-CN
meta.date=2025-10-11 18:38:53 (UTC+8)

# 操作日志（OperationViewer 眼睛图标与星石/辅星开关）

- 目标：在“密探与密探组”右侧问号的右侧新增“眼睛”图标，控制“星石/辅星”等信息显示，默认隐藏。

变更摘要：
- 在 `src/components/viewer/OperationViewer.tsx:640` 附近插入眼睛图标（Blueprint Icon：`eye-off`/`eye-open`），新增局部状态 `showExtras`（默认 false）。
- 将 `OperatorCard` 增加可选属性 `showExtras?: boolean`，并在命盘行中按状态条件渲染“主星/辅星”两列。
- 在两个 `OperatorCard` 调用处传入 `showExtras`，确保密探与密探组一致生效。

验证要点：
- 默认进入页面时“主星/辅星”不显示；点击眼睛图标切换显示；再次点击隐藏。
- 布局与样式与问号图标对齐，交互区域光标为指针。

工具：
- Desktop Commander apply_patch（两处增量补丁）

结果：
- 交互与显示符合预期；全局 `tsc` 存在与本次无关的历史报错（未纳入本次修复范围）。
