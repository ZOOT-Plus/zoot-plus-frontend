import { Button, Menu, MenuItem, Position } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'
import { useCurrentSize } from 'utils/useCurrenSize'
import { useTranslation } from '../i18n/i18n'
import { useTheme, THEME_CONFIG } from '../hooks/useTheme'

export const ThemeSwitchButton = () => {
  const t = useTranslation()
  const { theme, setTheme } = useTheme()
  const { isSM } = useCurrentSize()

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
    <label className="bp4-label !mb-0 inline-flex items-center">
      <Popover2
        content={themeMenu}
        placement="bottom"
        position={Position.BOTTOM}
        renderTarget={({ isOpen, ref, ...targetProps }) => (
          <div
            className="bp4-popover2-target !mt-0 flex items-center"
            ref={ref}
          >
            <Button
              {...targetProps}
              active={isOpen}
              icon={currentConfig.icon}
              text={!isSM ? currentLabel : undefined}
              rightIcon={!isSM ? 'caret-down' : undefined}
              className="!m-0"
            />
          </div>
        )}
      />
    </label>
  )
}
