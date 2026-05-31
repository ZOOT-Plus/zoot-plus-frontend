import { Button, Menu, MenuItem, Position } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import { useCurrentSize } from 'utils/useCurrenSize'

import { THEME_CONFIG, useTheme } from '../hooks/useTheme'
import { useTranslation } from '../i18n/i18n'

export const ThemeSwitchButton = () => {
  const t = useTranslation()
  const { theme, setTheme } = useTheme()
  const shrinked = useCurrentSize().isLG

  // 获取翻译对象根节点
  const labels = t.components.ThemeSwitchButton

  // 查找当前主题的配置用于显示按钮图标
  const currentConfig =
    THEME_CONFIG.find((item) => item.id === theme) || THEME_CONFIG[0]

  // 获取当前主题的翻译标签
  // 使用类型断言确保 i18nKey 是 labels 的合法属性
  const currentLabel = labels[currentConfig.i18nKey as keyof typeof labels]

  const renderOptionText = (text: string) => (
    <div className="flex items-start">
      <div className="flex flex-col">
        <div className="flex-1">{text}</div>
      </div>
    </div>
  )

  const themeMenu = (
    <Menu>
      {THEME_CONFIG.map((item) => (
        <MenuItem
          key={item.id}
          active={theme === item.id}
          icon={item.icon}
          // 动态获取翻译：labels[key]
          text={renderOptionText(
            labels[item.i18nKey as keyof typeof labels] || item.id,
          )}
          onClick={() => setTheme(item.id)}
          shouldDismissPopover={true}
        />
      ))}
    </Menu>
  )

  return (
    <Popover2
      content={themeMenu}
      position={Position.BOTTOM}
      renderTarget={({ isOpen, ref, ...targetProps }) => (
        <div className="bp4-popover2-target !mt-0 flex items-center" ref={ref}>
          <Button
            {...targetProps}
            active={isOpen}
            icon={currentConfig.icon}
            text={!shrinked ? currentLabel : undefined}
            rightIcon={!shrinked ? 'caret-down' : undefined}
            className="!m-0"
          />
        </div>
      )}
    />
  )
}
