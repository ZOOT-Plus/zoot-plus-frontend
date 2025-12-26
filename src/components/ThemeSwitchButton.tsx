import { Button, Menu, MenuItem, Position, IconName } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'
import { useCurrentSize } from 'utils/useCurrenSize'
import { useTranslation } from '../i18n/i18n'
import { useTheme, ThemeMode } from '../hooks/useTheme'

export const ThemeSwitchButton = () => {
  const t = useTranslation()
  const { theme, setTheme } = useTheme()
  const { isSM } = useCurrentSize()

  const themeConfig: Record<ThemeMode, { icon: IconName; label: string }> = {
    light: {
      icon: 'flash',
      label: t.components.ThemeSwitchButton.light,
    },
    dark: {
      icon: 'moon',
      label: t.components.ThemeSwitchButton.dark,
    },
    'high-contrast': {
      icon: 'contrast',
      label: t.components.ThemeSwitchButton.highContrast,
    },
  }

  const currentConfig = themeConfig[theme]

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
        text={renderOptionText(themeConfig.light.label)}
        onClick={() => setTheme('light')}
        shouldDismissPopover={true}
      />
      <MenuItem
        active={theme === 'dark'}
        icon="moon"
        text={renderOptionText(themeConfig.dark.label)}
        onClick={() => setTheme('dark')}
        shouldDismissPopover={true}
      />
      <MenuItem
        active={theme === 'high-contrast'}
        icon="contrast"
        text={renderOptionText(themeConfig['high-contrast'].label)}
        onClick={() => setTheme('high-contrast')}
        shouldDismissPopover={true}
      />
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
