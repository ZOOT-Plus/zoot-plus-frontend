import { Button, Card, Elevation, H4, Icon, Tag, Tooltip } from '@blueprintjs/core'

import { copyShortCode } from 'services/operation'

import { ReLink } from 'components/ReLink'
import { RelativeTime } from 'components/RelativeTime'
import { OperationSetListItem } from 'models/operation-set'

import { useTranslation } from '../i18n/i18n'
import { Paragraphs } from './Paragraphs'
import { UserName } from './UserName'

export const NeoOperationSetCard = ({ operationSet }: { operationSet: OperationSetListItem }) => {
  const t = useTranslation()
  return (
    <Card interactive={true} elevation={Elevation.TWO} className="relative flex flex-col gap-2">
      <ReLink search={{ opset: operationSet.id }} className="block no-underline hover:no-underline hover:text-inherit">
        {/* title */}
        <div className="flex gap-1">
          <Tooltip content={operationSet.name} className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
            <H4 className="p-0 m-0 mr-20 whitespace-nowrap overflow-hidden text-ellipsis">
              {operationSet.status === 'PRIVATE' && <Tag className="mr-1">{t.components.OperationSetCard.private}</Tag>}
              {operationSet.name}
            </H4>
          </Tooltip>
        </div>
        <div className="flex-1 flex flex-col my-3 gap-2 justify-center">
          <div className="text-gray-700 leading-normal">
            <Paragraphs
              content={operationSet.description}
              limitHeight={21 * 13.5} // 13 lines, 21px per line; the extra 0.5 line is intentional so the `mask` effect is obvious
            />
          </div>
        </div>

        <div className="flex">
          <div className="flex items-center text-zinc-500">
            <Icon icon="document" className="mr-1" />
            <span>
              {t.components.OperationSetCard.jobs_count({
                count: operationSet.copilotIds.length,
              })}
            </span>

            <Icon icon="time" className="ml-4 mr-1" />
            <RelativeTime TooltipProps={{ placement: 'top' }} moment={operationSet.createTime} />
          </div>
          <div className="flex-1" />
          <div className="text-zinc-500">
            <Icon icon="user" className="mr-1.5" />
            <UserName userId={operationSet.creatorId}>{operationSet.creator}</UserName>
          </div>
        </div>
      </ReLink>

      <CardActions className="absolute top-4 right-4" operationSet={operationSet} />
    </Card>
  )
}

export const OperationSetCard = ({ operationSet }: { operationSet: OperationSetListItem }) => {
  const t = useTranslation()
  return (
    <Card interactive={true} elevation={Elevation.TWO} className="relative mb-4 sm:mb-2 last:mb-0">
      <ReLink search={{ opset: operationSet.id }} className="block no-underline hover:no-underline hover:text-inherit">
        <div className="flex flex-wrap mb-4 sm:mb-2">
          {/* title */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <H4 className="inline-block pb-1 border-b-2 border-zinc-200 border-solid mb-2">{operationSet.name}</H4>
            </div>
          </div>

          <div className="grow basis-full xl:basis-0" />

          {/* meta */}
          <div className="flex flex-wrap items-start gap-x-4 gap-y-1 text-zinc-500">
            <div className="flex items-center">
              <Icon icon="document" className="mr-1" />
              <span>
                {t.components.OperationSetCard.jobs_count({
                  count: operationSet.copilotIds.length,
                })}
              </span>

              <Icon icon="time" className="ml-4 mr-1" />
              <RelativeTime TooltipProps={{ placement: 'top' }} moment={operationSet.createTime} />
            </div>
            <div>
              <Icon icon="user" className="mr-1.5" />
              <UserName userId={operationSet.creatorId}>{operationSet.creator}</UserName>
            </div>
          </div>
        </div>
        <div className="flex md:flex-row flex-col gap-4">
          <div className="text-gray-700 leading-normal md:w-1/2">
            <Paragraphs
              content={operationSet.description}
              limitHeight={21 * 13.5} // 13 lines, 21px per line; the extra 0.5 line is intentional so the `mask` effect is obvious
            />
          </div>
        </div>
      </ReLink>

      <CardActions className="absolute top-4 xl:top-12 right-[18px]" operationSet={operationSet} />
    </Card>
  )
}

const CardActions = ({ className, operationSet }: { className?: string; operationSet: OperationSetListItem }) => {
  const t = useTranslation()
  return (
    <div className={className}>
      <Tooltip
        placement="bottom"
        content={<div className="max-w-sm dark:text-slate-900">{t.components.OperationSetCard.copy_secret_code}</div>}
      >
        <Button
          small
          icon="clipboard"
          onClick={(e) => {
            e.stopPropagation()
            copyShortCode({ id: operationSet.id, type: 'operation-set' })
          }}
        />
      </Tooltip>
    </div>
  )
}
