import { Button, Menu, MenuItem, Position } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'
import { useCurrentSize } from 'utils/useCurrenSize'
import { useTheme, ThemeMode } from '../hooks/useTheme'

export const ThemeSwitchButton = () => {
  const { theme, setTheme } = useTheme()
  const { isSM } = useCurrentSize()

  const themeConfig: Record<ThemeMode, { icon: any; label: string }> = {
    light: { icon: 'flash', label: '浅色模式' },
    dark: { icon: 'moon', label: '深色模式' },
    'high-contrast': { icon: 'contrast', label: '深色模式 (高对比)' },
  }

  const currentConfig = themeConfig[theme]

  // 下拉菜单项的文本渲染结构
  const renderOptionText = (text: string) => (
    <div className="flex items-start">
      <div className="flex flex-col">
        <div className="flex-1">{text}</div>
      </div>
    </div>
  )

  const themeMenu = (
    <Menu>
      <MenuItem
        active={theme === 'light'}
        icon="flash"
        text={renderOptionText('浅色模式')}
        onClick={() => setTheme('light')}
        shouldDismissPopover={true}
      />
      <MenuItem
        active={theme === 'dark'}
        icon="moon"
        text={renderOptionText('深色模式')}
        onClick={() => setTheme('dark')}
        shouldDismissPopover={true}
      />
      <MenuItem
        active={theme === 'high-contrast'}
        icon="contrast"
        text={renderOptionText('深色模式 (高对比)')}
        onClick={() => setTheme('high-contrast')}
        shouldDismissPopover={true}
      />
    </Menu>
  )

  return (
    <label className="bp4-label !inline-flex items-center !mb-0 inline-flex">
      <Popover2
        content={themeMenu}
        placement="bottom"
        position={Position.BOTTOM}
        renderTarget={({ isOpen, ref, ...targetProps }) => (
          <div
            className="!mt-0 bp4-popover2-target flex items-center"
            ref={ref}
          >
            <Button
              {...targetProps}
              active={isOpen}
              icon={currentConfig.icon}
              text={!isSM ? currentConfig.label : undefined}
              rightIcon={!isSM ? 'caret-down' : undefined}
              className="!m-0"
            />
          </div>
        )}
      />
    </label>
  )
}
