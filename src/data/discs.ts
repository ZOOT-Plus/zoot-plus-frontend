// 命盘数据加载器：从项目根的 `命盘.json` 解析为 { 密探名字 -> 命盘集合[] }
// 使用 Vite 的 ?raw 导入并在运行时 JSON.parse
// 注意：命盘.json 中的 "命盘集合" 字段本身是一个 JSON 字符串，需要二次解析
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite raw import provides string
import rawJson from '../../命盘.json?raw'

export interface DiscItem {
  desp: string
  ot_name: string
  color: string
  name: string
  abbreviation: string
}

interface RawRecord {
  密探名字: string
  命盘集合: string // JSON string of DiscItem[]
}

export const DISCS: Record<string, DiscItem[]> = (() => {
  try {
    const list = JSON.parse(rawJson) as RawRecord[]
    const map: Record<string, DiscItem[]> = {}
    for (const rec of list) {
      try {
        map[rec.密探名字] = JSON.parse(rec.命盘集合) as DiscItem[]
      } catch {
        map[rec.密探名字] = []
      }
    }
    return map
  } catch (e) {
    console.error('Failed to parse 命盘.json:', e)
    return {}
  }
})()
