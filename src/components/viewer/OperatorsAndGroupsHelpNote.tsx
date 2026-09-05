import { Callout, Icon } from '@blueprintjs/core'

import { useTranslation } from '../../i18n/i18n'

/** 「干员与干员组」区块标题右侧的说明提示，作业详情与作业集详情共用 */
export function OperatorsAndGroupsHelpNote() {
  const t = useTranslation()

  return (
    <details className="inline">
      <summary className="inline cursor-pointer">
        <Icon icon="help" size={14} className="ml-2 mb-1 opacity-50" />
        {/* sr-only 文本而非 aria-label：<summary> 的内容命名（name from content）有全组合 AT 实测支持，aria-label 无直接测试矩阵 */}
        <span className="sr-only">{t.components.viewer.OperatorsAndGroupsHelpNote.toggle_label}</span>
      </summary>
      <Callout intent="primary" icon={null} className="mb-4">
        <p>
          {t.components.viewer.OperatorsAndGroupsHelpNote.note.jsx({
            operators: (s) => <b>{s}</b>,
            groups: (s) => <b>{s}</b>,
          })}
        </p>
      </Callout>
    </details>
  )
}
