import { chunk, compact } from 'lodash-es'

import { i18n } from '../i18n/i18n'

export interface Announcement {
  sections: AnnouncementSection[]
  raw: string
}

export interface AnnouncementSection {
  raw: string
  title: string
  meta?: AnnouncementSectionMeta
}

export interface AnnouncementSectionMeta extends Omit<Required<AnnouncementSectionMetaRaw>, 'time'> {
  time: Date
}

export interface AnnouncementSectionMetaRaw {
  time?: string | number
  level?: 'verbose' | 'info' | 'warning'
}

export function parseAnnouncement(raw: string): Announcement {
  // remove HTML comments:
  // actually there is a way to hide comments in react-markdown
  // (https://github.com/remarkjs/react-markdown#appendix-a-html-in-markdown)
  // but that can be dangerous, so we simply remove the comments
  raw = raw.replace(/<!--[\s\S]*?-->/g, '')

  // a section starts with a heading of arbitrary level
  const sectionSeparator = /^(#+)/m

  // will be like: ["###", "Section 1\nContent", "###", "Section 2\nContent", ...]
  const sectionSlices = raw
    .split(sectionSeparator)
    // ignore everything before the first section
    .slice(1)

  const rawSections = chunk(sectionSlices, 2).map(([headingMarks, rest]) => headingMarks + rest)

  const sections: (AnnouncementSection | undefined)[] = rawSections.map((rawSection) => {
    try {
      const emptyLinesMatcher = /^(\s*\n)+/m
      const slices = rawSection.split(emptyLinesMatcher)
      const segments = compact(slices.map((s) => s.trim())) // filter out the matched empty lines

      const title = segments[0]?.replace(/^#+/, '').trim() || i18n.models.announcement.default_title

      let meta: AnnouncementSectionMeta | undefined
      const jsonBlockStart = '```json'
      const jsonBlockEnd = '```'

      if (segments[1]?.startsWith(jsonBlockStart)) {
        // remove the block to hide it from view
        rawSection = rawSection.replace(segments[1], '')

        meta = parseSectionMeta(segments[1].slice(jsonBlockStart.length, -jsonBlockEnd.length))
      }

      return {
        title,
        meta,
        raw: rawSection,
      }
    } catch (e) {
      console.warn(e)
      return undefined
    }
  })

  return {
    sections: compact(sections),
    raw,
  }
}

function parseSectionMeta(json: string) {
  try {
    const rawMeta = JSON.parse(json) as AnnouncementSectionMetaRaw

    let time: Date

    try {
      time = new Date(rawMeta.time || 0)
    } catch (e) {
      time = new Date(0)
      console.warn(e)
    }

    return {
      time,
      level: rawMeta.level || 'info',
    }
  } catch (e) {
    console.warn(e)
  }

  return undefined
}
