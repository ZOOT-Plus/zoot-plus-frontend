import { access } from 'fs/promises'
import { capitalize, uniq, uniqBy } from 'lodash-es'
import { pinyin } from 'pinyin'
import simplebig from 'simplebig'

type Profession = { id: string; name: string; name_en?: string }
type Professions = (Profession & { sub: Profession[] })[]

export async function fileExists(file: string) {
  try {
    await access(file)
    return true
  } catch (e) {
    return false
  }
}

function pinyinify(name: string) {
  return [
    pinyin(name, {
      compact: true,
      heteronym: true,
      style: pinyin.STYLE_NORMAL,
    }),
    pinyin(name, {
      compact: true,
      heteronym: true,
      style: pinyin.STYLE_FIRST_LETTER,
    }),
  ].flatMap((py) => py.map((el) => el.join('')))
}

function transformOperatorName(name: string) {
  const cleanedName = name.replace(/[”“"]/g, '')

  const traditional = simplebig.s2t(name) as string
  const cleanedTraditional = traditional.replace(/[”“"]/g, '')

  return {
    name,
    alias: uniq([
      ...pinyinify(cleanedName),
      traditional,
      cleanedTraditional,
      ...pinyinify(cleanedTraditional),
    ]).join(' '),
  }
}

const CHARACTER_TABLE_JSON_URL_CN =
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json'
const UNIEQUIP_TABLE_JSON_URL_CN =
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/uniequip_table.json'
const CHARACTER_TABLE_JSON_URL_EN =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/refs/heads/master/en/gamedata/excel/character_table.json'
const UNIEQUIP_TABLE_JSON_URL_EN =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/refs/heads/master/en/gamedata/excel/uniequip_table.json'

const CHARACTER_BLOCKLIST = [
  'char_512_aprot', // 暮落(集成战略)：It's just not gonna be there.
  'token_10012_rosmon_shield', // 迷迭香的战术装备：It's just not gonna be there.
]

const PROFESSIONS = {
  PIONEER: {
    name: '先锋',
    name_en: 'Vanguard',
    code: 512,
  },
  WARRIOR: {
    name: '近卫',
    name_en: 'Guard',
    code: 1,
  },
  TANK: {
    name: '重装',
    name_en: 'Defender',
    code: 4,
  },
  SNIPER: {
    name: '狙击',
    name_en: 'Sniper',
    code: 2,
  },
  CASTER: {
    name: '术师',
    name_en: 'Caster',
    code: 32,
  },
  MEDIC: {
    name: '医疗',
    name_en: 'Medic',
    code: 8,
  },
  SUPPORT: {
    name: '辅助',
    name_en: 'Supporter',
    code: 16,
  },
  SPECIAL: {
    name: '特种',
    name_en: 'Specialist',
    code: 64,
  },
}

async function json(url: string) {
  return (await (await fetch(url)).json()) as any
}

export async function getOperators() {
  const [charTableCN, uniequipTableCN, charTableEN, uniequipTableEN] =
    await Promise.all([
      json(CHARACTER_TABLE_JSON_URL_CN),
      json(UNIEQUIP_TABLE_JSON_URL_CN),
      json(CHARACTER_TABLE_JSON_URL_EN),
      json(UNIEQUIP_TABLE_JSON_URL_EN),
    ])

  const {
    subProfDict: subProfDictCN,
    subProfToProfDict,
    equipDict,
  } = uniequipTableCN
  const { subProfDict: subProfDictEN } = uniequipTableEN
  const equipsByOperatorId = Object.values(equipDict).reduce(
    (acc: Record<string, any[]>, equip: any) => {
      acc[equip.charId] ||= []
      acc[equip.charId].push(equip)
      return acc
    },
    {},
  )

  const professions: Professions = Object.entries(PROFESSIONS).map(
    ([id, { name, name_en, code }]) => {
      const subProfessions = (
        Object.values(subProfDictCN) as {
          subProfessionId: string
          subProfessionName: string
          subProfessionCatagory: number
        }[]
      )
        .filter((x) => subProfToProfDict[x.subProfessionId] === code)
        .sort((a, b) => a.subProfessionCatagory - b.subProfessionCatagory)
        .map(({ subProfessionId, subProfessionName }) => ({
          id: subProfessionId,
          name: subProfessionName,
          name_en:
            subProfDictEN[subProfessionId]?.subProfessionName ||
            capitalize(subProfessionId),
        }))
      return {
        id,
        name,
        name_en,
        sub: subProfessions,
      }
    },
  )

  const opIds = Object.keys(charTableCN)
  const result = uniqBy(
    opIds.flatMap((id) => {
      const op = charTableCN[id]
      const enName = charTableEN[id]?.name || op.appellation || op.name

      if (['TRAP'].includes(op.profession)) return []

      const modules = uniq(
        equipsByOperatorId[id]
          ?.sort((a, b) => a.charEquipOrder - b.charEquipOrder)
          .map(({ typeName1, typeName2 }) => {
            return typeName1 === 'ORIGINAL' ? '' : typeName2
          }),
      )
      return [
        {
          id: id,
          prof: op.profession,
          subProf: op.subProfessionId,
          name_en: enName,
          ...transformOperatorName(op.name),
          rarity:
            op.subProfessionId === 'notchar1'
              ? 0
              : Number(op.rarity?.split('TIER_').join('') || 0),
          alt_name: op.appellation,
          modules: modules.length > 0 ? modules : undefined,
        },
      ]
    }),
    (el) => el.id,
  ).sort((a, b) => {
    // 默认的 pinyin.compare() 没有传入 locale 参数，导致在不同的系统上有不同的排序结果，
    // 所以这里手动实现一下，并带上 locale
    // https://github.com/MaaAssistantArknights/maa-copilot-frontend/pull/265
    const pinyinA = String(pinyin(a.name))
    const pinyinB = String(pinyin(b.name))
    return (
      pinyinA.localeCompare(pinyinB, 'zh') || a.id.localeCompare(b.id, 'en')
    )
  })
  return {
    professions,
    operators: result.filter((el) => !CHARACTER_BLOCKLIST.includes(el.id)),
  }
}
