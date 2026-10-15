import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createStore, Provider } from 'jotai'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import englishTranslations from '../../../i18n/generated/en'
import { i18n, rawTranslationsAtom } from '../../../i18n/i18n'
import { favOperatorAtom } from '../../../store/useFavOperators'
import { EditorPerformerOperator, type EditorPerformerOperatorProps } from './EditorPerformerOperator'
import { SheetProvider, type SheetProviderProp } from './sheet/SheetProvider'
import { SkillAboutTrigger } from './sheet/SheetOperatorSkillAbout'
import { SheetOperatorItem } from './sheet/sheetOperator/SheetOperatorItem'

afterEach(cleanup)

describe('v1 operator skill selection', () => {
  it('saves an explicit change from S2 to unspecified', async () => {
    const submit = vi.fn<EditorPerformerOperatorProps['submit']>(() => true)
    const { container } = render(
      createElement(EditorPerformerOperator, {
        operator: { name: '阿米娅', skill: 2 },
        groups: [],
        submit,
        onCancel: vi.fn(),
        categorySelector: createElement('span', null, 'Operator'),
      }),
    )

    const skillLabels = i18n.components.editor.operator.EditorOperatorSkill
    fireEvent.click(screen.getByRole('button', { name: skillLabels.skill_number({ count: 2 }) }))
    fireEvent.click(await screen.findByText(skillLabels.skill_number({ count: 0 })))
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(submit).toHaveBeenCalled())
    expect(submit.mock.calls[0][0]).toMatchObject({ skill: 0 })
  })

  it.each([0, 1, 2, 3, undefined])('preserves skill %s when saving the operator form', async (skill) => {
    const submit = vi.fn<EditorPerformerOperatorProps['submit']>(() => true)
    const { container } = render(
      createElement(EditorPerformerOperator, {
        operator: { name: '阿米娅', skill },
        groups: [],
        submit,
        onCancel: vi.fn(),
        categorySelector: createElement('span', null, 'Operator'),
      }),
    )

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(submit).toHaveBeenCalled())
    expect(submit.mock.calls[0][0]).toMatchObject({ name: '阿米娅', skill: skill ?? 1 })
  })

  it.each([0, 1, 2, 3, undefined])('preserves skill %s when confirming the quick editor', async (skill) => {
    const onSkillChange = vi.fn()
    render(createElement(SkillAboutTrigger, { operator: { name: '阿米娅', skill }, onSkillChange }))
    const triggerText = skill
      ? i18n.models.operator.skill_number({ count: skill })
      : i18n.components.editor.operator.sheet.SheetOperatorSkillAbout.not_set
    fireEvent.click(screen.getByText(triggerText))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(onSkillChange).toHaveBeenCalled())
    expect(onSkillChange.mock.calls[0][0]).toMatchObject({ name: '阿米娅', skill: skill ?? 1 })
  })

  it('preserves an unspecified skill when adding the operator to favorites', () => {
    const store = createStore()
    store.set(rawTranslationsAtom, { language: 'en', data: englishTranslations })
    store.set(favOperatorAtom, [])
    const submitOperator = vi.fn<EditorPerformerOperatorProps['submit']>(() => true)
    const sheetProps: SheetProviderProp = {
      existedOperators: [{ name: '阿米娅', skill: 0 }],
      existedGroups: [],
      submitOperator,
      submitGroup: vi.fn(() => true),
      removeOperator: vi.fn(),
      removeGroup: vi.fn(),
      children: createElement(SheetOperatorItem, { name: '阿米娅' }),
    }
    const { container } = render(createElement(Provider, { store }, createElement(SheetProvider, sheetProps)))

    fireEvent.click(container.querySelector('[data-icon="unpin"]')!)

    expect(store.get(favOperatorAtom)).toEqual([expect.objectContaining({ name: '阿米娅', skill: 0 })])
    expect(submitOperator).toHaveBeenCalledWith(expect.objectContaining({ skill: 0 }), undefined, true)
  })
})
