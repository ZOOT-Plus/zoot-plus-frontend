import { isString } from '@sentry/utils'

import { Link, LinkProps, useHref, useLinkClickHandler, useSearchParams } from 'react-router-dom'
import { SetOptional } from 'type-fest'

interface ReLinkProps extends SetOptional<LinkProps, 'to'> {
  search?: Record<string, string | number | boolean | undefined>
}

// ReLink = Refined Link. Or whatever you think it to be.
export function ReLink({ className, search, ...props }: ReLinkProps) {
  const [searchParams] = useSearchParams()

  if (search) {
    for (const [key, value] of Object.entries(search)) {
      if (value === undefined) {
        searchParams.delete(key)
      } else {
        searchParams.set(key, String(value))
      }
    }
  }

  return (
    <Link
      {...props}
      className={className}
      to={isString(props.to) ? props.to : { ...props.to, search: searchParams.toString() }}
    />
  )
}

interface ReLinkRendererProps<T extends Element> extends Omit<ReLinkProps, 'onClick' | 'onKeyDown' | 'children'> {
  render?: (props: RenderProps<T>) => JSX.Element
  children?: (props: RenderProps<T>) => JSX.Element
}

interface RenderProps<T extends Element> extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'onClick' | 'onKeyDown'
> {
  onClick: (event: React.MouseEvent<T>) => void
  onKeyDown: (event: React.KeyboardEvent<T>) => void
}

// https://reactrouter.com/6.30.0/hooks/use-link-click-handler
export function ReLinkRenderer<T extends Element = Element>({
  className,
  search,
  to,
  replace = false,
  state,
  target,
  render,
  children,
  ...props
}: ReLinkRendererProps<T>) {
  const [searchParams] = useSearchParams()

  if (search) {
    for (const [key, value] of Object.entries(search)) {
      if (value === undefined) {
        searchParams.delete(key)
      } else {
        searchParams.set(key, String(value))
      }
    }
  }

  to = isString(to) ? to : { ...to, search: searchParams.toString() }

  const href = useHref(to)

  const handleClick = useLinkClickHandler<T>(to, {
    replace,
    state,
    target,
  })

  return (render ?? children)!({
    className,
    target,
    href,
    onClick: (event) => {
      if (!event.defaultPrevented) {
        handleClick(event)
      }
    },
    onKeyDown: (event) => {
      if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
        const e = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        })
        event.currentTarget.dispatchEvent(e)
      }
    },
    ...props,
  })
}
