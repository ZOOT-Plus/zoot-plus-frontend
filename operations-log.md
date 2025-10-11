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
