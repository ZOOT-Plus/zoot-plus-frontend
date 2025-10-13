import {
  Button,
  Callout,
  Checkbox,
  Dialog,
  DialogProps,
  Icon,
  InputGroup,
  Menu,
  MenuItem,
  NonIdealState,
  TextArea,
} from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { useOperations } from 'apis/operation'
import {
  createOperationSet,
  updateOperationSet,
  useRefreshOperationSet,
  useRefreshOperationSets,
} from 'apis/operation-set'
import clsx from 'clsx'
import { UpdateCopilotSetRequest } from 'maa-copilot-client'
import {
  Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Controller, UseFormSetError, useForm } from 'react-hook-form'

import { FormField } from 'components/FormField'
import { AppToaster } from 'components/Toaster'
import { Sortable } from 'components/dnd'
import { Level, Operation } from 'models/operation'
import { OperationSet } from 'models/operation-set'
import { formatError } from 'utils/error'

import { useLevels } from '../../apis/level'
import { useTranslation } from '../../i18n/i18n'
import { findLevelByStageName } from '../../models/level'

export function OperationSetEditorLauncher() {
  const t = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button large fill icon="folder-close" onClick={() => setIsOpen(true)}>
        {t.components.operationSet.OperationSetEditor.create_job_set}
      </Button>
      <OperationSetEditorDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

interface OperationSetEditorDialogProps extends DialogProps {
  operationSet?: OperationSet
  isOpen: boolean
  onClose: () => void
}

export function OperationSetEditorDialog({
  isOpen,
  onClose,
  operationSet,
  ...props
}: OperationSetEditorDialogProps) {
  const t = useTranslation()
  const isEdit = !!operationSet

  const refreshOperationSets = useRefreshOperationSets()
  const refreshOperationSet = useRefreshOperationSet()

  const onSubmit: FormProps['onSubmit'] = async ({
    name,
    description,
    status,
    copilotIds,
  }) => {
    const updateInfo = async () => {
      if (isEdit) {
        const params: UpdateCopilotSetRequest['copilotSetUpdateReq'] = {
          id: operationSet!.id,
          name,
          description,
          status,
          copilotIds,
        }

        await updateOperationSet(params)

        AppToaster.show({
          intent: 'success',
          message: t.components.operationSet.OperationSetEditor.update_success,
        })
      } else {
        await createOperationSet({
          name,
          description,
          status,
          operationIds: [],
        })

        AppToaster.show({
          intent: 'success',
          message: t.components.operationSet.OperationSetEditor.create_success,
        })
      }

      refreshOperationSets()

      if (operationSet) {
        refreshOperationSet(operationSet.id)
      }
    }

    await updateInfo()

    onClose()
  }

  return (
    <Dialog
      title={
        isEdit
          ? t.components.operationSet.OperationSetEditor.edit_job_set
          : t.components.operationSet.OperationSetEditor.create_job_set
      }
      icon="folder-close"
      className="w-auto"
      isOpen={isOpen}
      onClose={onClose}
      {...props}
    >
      <OperationSetForm
        key={operationSet?.id}
        operationSet={operationSet}
        onSubmit={onSubmit}
      />
    </Dialog>
  )
}

interface FormProps {
  operationSet?: OperationSet
  onSubmit: (
    values: FormValues,
    setError: UseFormSetError<FormValues>,
  ) => void | Promise<void>
}

interface FormValues {
  name: string
  description: string
  status: 'PUBLIC' | 'PRIVATE'

  idsToAdd?: number[]
  idsToRemove?: number[]
  copilotIds?: number[]
}

function OperationSetForm({ operationSet, onSubmit }: FormProps) {
  const t = useTranslation()
  const isEdit = !!operationSet

  const operationSelectorRef = useRef<OperationSelectorRef>(null)
  const [globalError, setGlobalError] = useState<string>()

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: operationSet || {
      name: '',
      description: '',
      status: 'PRIVATE',
    },
  })

  const localOnSubmit = handleSubmit(async (values) => {
    try {
      await onSubmit(
        {
          ...values,
          ...operationSelectorRef.current?.getValues(),
        },
        setError,
      )
    } catch (e) {
      console.warn(e)
      setGlobalError(formatError(e))
    }
  })

  return (
    <form
      className={clsx(
        'p-4 w-[500px] max-w-[100vw] max-h-[calc(100vh-20rem)] min-h-[18rem] flex flex-col overflow-auto lg:overflow-hidden',
        isEdit && 'lg:w-[1000px]',
      )}
      onSubmit={localOnSubmit}
    >
      <div className="gap-4 flex flex-wrap-reverse lg:flex-nowrap lg:overflow-hidden">
        {isEdit && (
          <div className="grow basis-full lg:overflow-y-auto border-t lg:border-t-0 lg:border-r border-slate-200">
            {operationSet.copilotIds.length > 0 ? (
              <OperationSelector
                key={operationSet.id}
                operationSet={operationSet}
                selectorRef={operationSelectorRef}
              />
            ) : (
              <NonIdealState
                icon="helicopter"
                description={
                  <>
                    {t.components.operationSet.OperationSetEditor.no_jobs_yet}
                    <br />
                    {t.components.operationSet.OperationSetEditor.add_from_list}
                  </>
                }
              />
            )}
          </div>
        )}

        <div className="grow basis-full lg:overflow-y-auto">
          <FormField
            label={t.components.operationSet.OperationSetEditor.title}
            field="name"
            control={control}
            error={errors.name}
            ControllerProps={{
              rules: {
                required:
                  t.components.operationSet.OperationSetEditor.title_required,
              },
              render: (renderProps) => (
                <InputGroup
                  {...renderProps.field}
                  value={renderProps.field.value || ''}
                />
              ),
            }}
          />

          <FormField
            label={t.components.operationSet.OperationSetEditor.description}
            field="description"
            control={control}
            error={errors.description}
            ControllerProps={{
              render: (renderProps) => (
                <TextArea
                  rows={6}
                  {...renderProps.field}
                  value={renderProps.field.value || ''}
                />
              ),
            }}
          />

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Checkbox
                {...field}
                value={undefined}
                checked={field.value === 'PUBLIC'}
                onChange={(e) =>
                  field.onChange(
                    (e.target as HTMLInputElement).checked
                      ? 'PUBLIC'
                      : 'PRIVATE',
                  )
                }
                label={
                  t.components.operationSet.OperationSetEditor.visible_to_all
                }
              />
            )}
          />
        </div>
      </div>

      <div className="flex items-end">
        {isEdit && (
          <div className="text-xs text-gray-500">
            <Icon icon="info-sign" />{' '}
            {t.components.operationSet.OperationSetEditor.click_save}
          </div>
        )}

        <Button
          disabled={isSubmitting}
          intent="primary"
          loading={isSubmitting}
          type="submit"
          icon="floppy-disk"
          className="ml-auto"
        >
          {isEdit
            ? t.components.operationSet.OperationSetEditor.save
            : t.components.operationSet.OperationSetEditor.create}
        </Button>
      </div>

      {globalError && (
        <Callout
          intent="danger"
          icon="error"
          title={t.components.operationSet.OperationSetEditor.error}
        >
          {globalError}
        </Callout>
      )}
    </form>
  )
}

interface OperationSelectorProps {
  operationSet: OperationSet

  // 这个组件做成受控组件的话，输入输出比较难处理，所以做成非受控组件，用 ref 获取值
  selectorRef: Ref<OperationSelectorRef>
}

interface OperationSelectorRef {
  getValues(): {
    copilotIds?: number[]
  }
}

function OperationSelector({
  operationSet,
  selectorRef,
}: OperationSelectorProps) {
  const t = useTranslation()
  const { operations, error } = useOperations({
    operationIds: operationSet.copilotIds,
  })
  const {
    data: levels,
    isLoading: levelLoading,
    error: levelError,
  } = useLevels()

  const [renderedOperations, setRenderedOperations] = useState<Operation[]>([])
  useEffect(() => {
    setRenderedOperations([...(operations ?? [])])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations.length])

  const [checkboxOverrides, setCheckboxOverrides] = useState(
    {} as Record<number, boolean>,
  )

  const alreadyAdded = useCallback(
    (operationId: number) => operationSet.copilotIds.includes(operationId),
    [operationSet.copilotIds],
  )

  useImperativeHandle(
    selectorRef,
    () => ({
      getValues() {
        const copilotIds: number[] = []
        copilotIds.push(
          ...renderedOperations
            .map(({ id }) => (checkboxOverrides[id] === false ? 0 : id))
            .filter((id) => !!id),
        )

        return { copilotIds }
      },
    }),
    [checkboxOverrides, renderedOperations],
  )

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setRenderedOperations((items) => {
        const oldIndex = items.findIndex((v) => v.id === active.id)
        const newIndex = items.findIndex((v) => v.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const sort = (type: 'title' | 'level' | 'id' | 'reverse') => {
    const levelCache: Record<string, Level | undefined> = {}
    setRenderedOperations((items) => {
      if (type === 'reverse') {
        return [...items].reverse()
      }
      return [...items].sort((a, b) => {
        if (type === 'title') {
          return a.parsedContent.doc.title.localeCompare(
            b.parsedContent.doc.title,
          )
        } else if (type === 'level') {
          const aLevel = (levelCache[a.parsedContent.stageName] ??=
            findLevelByStageName(levels, a.parsedContent.stageName))
          const bLevel = (levelCache[b.parsedContent.stageName] ??=
            findLevelByStageName(levels, b.parsedContent.stageName))

          if (aLevel && bLevel) {
            return aLevel.catThree.localeCompare(bLevel.catThree)
          } else if (!aLevel && !bLevel) {
            // 如果两个都是未知关卡，可能是自定义关卡，或者关卡列表加载失败，直接按 stageName 排序
            return a.parsedContent.stageName.localeCompare(
              b.parsedContent.stageName,
            )
          } else if (!aLevel) {
            // 未知关卡排最后面
            return 1
          } else if (!bLevel) {
            return -1
          }
        }
        return a.id - b.id
      })
    })
  }

  return (
    <div>
      <div className="mb-2 flex">
        <Popover2
          minimal
          captureDismiss
          placement="bottom-start"
          // 在 Dialog 内启用 Portal 并提升层级，避免被容器 overflow 或对话框内容层遮挡
          usePortal={true}
          portalClassName="operation-viewer-portal"
          content={
            <Menu>
              <MenuItem
                disabled={levelLoading}
                icon="sort-alphabetical"
                text={
                  t.components.operationSet.OperationSetEditor.sort_by_level +
                  (levelLoading
                    ? ' (' +
                      t.components.operationSet.OperationSetEditor.loading +
                      ')'
                    : levelError
                      ? ' (' +
                        t.components.operationSet.OperationSetEditor
                          .level_load_failed +
                        ')'
                      : '')
                }
                onClick={() => sort('level')}
              />
              <MenuItem
                icon="sort-alphabetical"
                text={
                  t.components.operationSet.OperationSetEditor.sort_by_title
                }
                onClick={() => sort('title')}
              />
              <MenuItem
                icon="sort-numerical"
                text={t.components.operationSet.OperationSetEditor.sort_by_id}
                onClick={() => sort('id')}
              />
            </Menu>
          }
        >
          <Button
            small
            minimal
            icon="sort"
            text={
              t.components.operationSet.OperationSetEditor.quick_sort + '...'
            }
          />
        </Popover2>
        <Button
          small
          minimal
          icon="reset"
          text={t.components.operationSet.OperationSetEditor.reverse_list}
          onClick={() => sort('reverse')}
        />
      </div>

      {error && (
        <Callout
          intent="danger"
          icon="error"
          title={t.components.operationSet.OperationSetEditor.error}
        >
          {formatError(error)}
        </Callout>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={(renderedOperations ?? []).map(({ id }) => id)}
          strategy={verticalListSortingStrategy}
        >
          {renderedOperations?.map(({ id, parsedContent }) => (
            <Sortable key={id} id={id}>
              {({ listeners, attributes }) => (
                <div
                  key={id}
                  className="flex items-center hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <Icon
                    className="cursor-grab active:cursor-grabbing p-1 -my-1 -ml-2 -mr-1 rounded-[1px]"
                    icon="drag-handle-vertical"
                    {...listeners}
                    {...attributes}
                  />
                  <Checkbox
                    className={clsx(
                      'flex items-center m-0 p-2 !pl-10 flex-1',
                      checkboxOverrides[id] !== undefined &&
                        checkboxOverrides[id] !== alreadyAdded(id) &&
                        'font-bold',
                    )}
                    checked={checkboxOverrides[id] ?? alreadyAdded(id)}
                    onChange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked
                      setCheckboxOverrides((prev) => ({
                        ...prev,
                        [id]: checked,
                      }))
                    }}
                  >
                    <div className="tabular-nums text-slate-500">
                      {id}:&nbsp;
                    </div>
                    <div className="truncate text-ellipsis">
                      {parsedContent.doc.title}
                    </div>
                  </Checkbox>
                </div>
              )}
            </Sortable>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
