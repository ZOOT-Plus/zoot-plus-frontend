/*
 * Format: maay://123456
 * Note that operations and operation sets share the same ID space
 * and currently there is no way to distinguish them.
 */

const shortCodeScheme = 'maay://'

export interface ShortCodeContent {
  id: number
}

export function toShortCode({ id }: ShortCodeContent) {
  return shortCodeScheme + id
}

export function parseShortCode(code: string): ShortCodeContent | null {
  if (code.startsWith(shortCodeScheme)) {
    const idStr = code.slice(shortCodeScheme.length)
    const content: ShortCodeContent = {
      id: +idStr,
    }

    if (!isNaN(content.id)) {
      return content
    }
  }
  return null
}
