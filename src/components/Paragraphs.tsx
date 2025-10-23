import Linkify from 'linkify-react'
import { FC, memo, useEffect, useRef, useState } from 'react'

export const Paragraphs: FC<{
  content?: string
  linkify?: boolean
  limitHeight?: number
}> = memo(({ content, linkify, limitHeight }) => {
  const paragraphElementRef = useRef<HTMLDivElement>(null)
  const paragraphs = content?.split('\n').map((el) => el.trim())

  // exceededLimitHeight
  const [exceededLimitHeight, setExceededLimitHeight] = useState(false)

  useEffect(() => {
    if (!paragraphElementRef.current || !limitHeight) {
      return
    }

    const { height } = paragraphElementRef.current.getBoundingClientRect()

    setExceededLimitHeight(height > limitHeight)
  }, [limitHeight])

  const mask = exceededLimitHeight
    ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) calc(100% - 2rem), rgba(0,0,0,0) 100%)'
    : 'none'

  const child = (
    <div
      className="text-gray-700 dark:[&_p]:text-gray-300 dark:[&_div]:text-gray-300 dark:[&_span]:text-gray-300 leading-normal"
      style={{
        maxHeight: limitHeight,
        overflow: 'hidden',
        mask,
        WebkitMask: mask,
        background: exceededLimitHeight
          ? 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) calc(100% - 2rem), rgba(0,0,0,0.1) 100%)'
          : 'none',
      }}
    >
      <div ref={paragraphElementRef}>
        {paragraphs?.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  )

  return linkify ? (
    <Linkify
      options={{
        attributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        className: 'break-all',
        format: {
          url: (value) =>
            value.length > 50 ? value.slice(0, 50) + '…' : value,
        },
      }}
    >
      {child}
    </Linkify>
  ) : (
    child
  )
})

Paragraphs.displayName = 'Paragraphs'
